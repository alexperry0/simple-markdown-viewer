use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;

use notify_debouncer_mini::notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, Debouncer};
use tauri::Emitter;
use tauri_plugin_dialog::DialogExt;

struct WatcherState {
    watchers: Mutex<HashMap<PathBuf, Debouncer<RecommendedWatcher>>>,
}

#[tauri::command]
async fn open_file_dialog(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let (sender, receiver) = std::sync::mpsc::channel();

    app.dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown"])
        .pick_files(move |file_paths| {
            let result = match file_paths {
                Some(paths) => paths
                    .into_iter()
                    .filter_map(|p| p.into_path().ok().map(|pb| pb.to_string_lossy().to_string()))
                    .collect(),
                None => Vec::new(),
            };
            let _ = sender.send(result);
        });

    receiver.recv().map_err(|e| e.to_string())
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    let p = std::path::Path::new(&path);
    match p.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase()) {
        Some(ref ext) if ext == "md" || ext == "markdown" => {}
        _ => return Err("Only markdown files can be read".into()),
    }
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn watch_file(
    app: tauri::AppHandle,
    path: String,
    state: tauri::State<'_, WatcherState>,
) -> Result<(), String> {
    let target = PathBuf::from(&path)
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let watch_dir = target
        .parent()
        .ok_or("Cannot get parent directory")?
        .to_path_buf();
    let app_handle = app.clone();
    let target_path = target.clone();
    let emit_path = path.clone();

    let mut debouncer = new_debouncer(
        Duration::from_millis(300),
        move |res: DebounceEventResult| {
            if let Ok(events) = res {
                let matched = events.iter().any(|e| {
                    e.path.canonicalize().map_or(false, |p| p == target_path)
                });
                if matched {
                    let _ = app_handle.emit("file-changed", &emit_path);
                }
            }
        },
    )
    .map_err(|e| e.to_string())?;

    debouncer
        .watcher()
        .watch(&watch_dir, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    state
        .watchers
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .insert(target, debouncer);

    Ok(())
}

#[tauri::command]
fn unwatch_file(path: String, state: tauri::State<'_, WatcherState>) -> Result<(), String> {
    if let Ok(target) = PathBuf::from(&path).canonicalize() {
        state
            .watchers
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .remove(&target);
    }
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(WatcherState {
            watchers: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            read_file,
            watch_file,
            unwatch_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
