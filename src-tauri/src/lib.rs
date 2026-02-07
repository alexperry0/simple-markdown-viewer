use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;

use notify_debouncer_mini::notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, Debouncer};
use tauri::Emitter;
use tauri_plugin_dialog::DialogExt;

struct WatcherState {
    watcher: Mutex<Option<Debouncer<RecommendedWatcher>>>,
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
                let matched = events.iter().any(|e| e.path == target_path);
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

    // Replace any existing watcher (drops the old one, stopping it)
    *state.watcher.lock().map_err(|e| e.to_string())? = Some(debouncer);

    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(WatcherState {
            watcher: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            read_file,
            watch_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
