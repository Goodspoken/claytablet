use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Returns a no-op — cursor position is handled on the frontend
/// using the mousemove event in the Quick Paste component.
#[tauri::command]
pub fn get_cursor_position() -> (i32, i32) {
    (0, 0)
}

/// Lazily creates (or shows) the Quick Paste popup window.
/// The window is alwaysOnTop, skipTaskbar, undecorated, 400×300px.
#[tauri::command]
pub async fn open_quick_paste(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("quick-paste") {
        w.show().map_err(|e| e.to_string())?;
        w.set_focus().map_err(|e| e.to_string())?;
    } else {
        WebviewWindowBuilder::new(
            &app,
            "quick-paste",
            WebviewUrl::App("/quick-paste".into()),
        )
        .title("Quick Paste — ClayTablet")
        .inner_size(400.0, 320.0)
        .always_on_top(true)
        .skip_taskbar(true)
        .decorations(false)
        .resizable(false)
        .build()
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Placeholder — the actual clipboard-to-room logic runs on the frontend
/// via tauri-plugin-clipboard-manager + fetch to the REST API.
#[tauri::command]
pub async fn send_clipboard_to_room(_room_id: String) -> Result<(), String> {
    Ok(())
}
