mod commands;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_cursor_position,
            commands::open_quick_paste,
            commands::send_clipboard_to_room,
        ])
        .setup(|app| {
            setup_tray(app.handle())?;
            setup_shortcuts(app.handle());

            // Intercept window close: hide to tray instead of quitting
            let win = app.get_webview_window("main").unwrap();
            let win_clone = win.clone();
            win.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = win_clone.hide();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Открыть ClayTablet", true, None::<&str>)?;
    let copy_link = MenuItem::with_id(
        app,
        "copy_link",
        "Скопировать ссылку на комнату",
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&open, &copy_link, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                    let _ = w.unminimize();
                }
            }
            "copy_link" => {
                // Tell frontend to copy the current room link
                let _ = app.emit("tray:copy-link", ());
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // Single left-click → show/focus main window
            if let TrayIconEvent::Click {
                button: tauri::tray::MouseButton::Left,
                button_state: tauri::tray::MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                    let _ = w.unminimize();
                }
            }
        })
        .build(app)?;

    Ok(())
}

fn setup_shortcuts(app: &AppHandle) {
    let shortcut_v = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyV);
    let shortcut_c = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyC);

    let sv = shortcut_v.clone();
    let sc = shortcut_c.clone();

    let _ = app
        .global_shortcut()
        .on_shortcuts([shortcut_v, shortcut_c], move |app, shortcut, _event| {
            // Callback: (app: &AppHandle, shortcut: &Shortcut, event: ShortcutEvent)
            if shortcut == &sv {
                let _ = app.emit("shortcut:quick-paste", ());
            } else if shortcut == &sc {
                let _ = app.emit("shortcut:send-clipboard", ());
            }
        });
}
