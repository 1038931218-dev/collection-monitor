#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Click HedgeVPN connect button using Windows API
"""
import time
import ctypes
from ctypes import wintypes, CFUNCTYPE, POINTER

user32 = ctypes.windll.user32

def get_screen_size():
    """Get virtual screen size"""
    x = user32.GetSystemMetrics(76)  # SM_XVIRTUALSCREEN
    y = user32.GetSystemMetrics(77)  # SM_YVIRTUALSCREEN
    w = user32.GetSystemMetrics(78)  # SM_CXVIRTUALSCREEN
    h = user32.GetSystemMetrics(79)  # SM_CYVIRTUALSCREEN
    return x, y, w, h

def get_window_text(hwnd):
    """Get window text"""
    text_len = user32.GetWindowTextLengthW(hwnd)
    if text_len > 0:
        buffer = ctypes.create_unicode_buffer(text_len + 1)
        user32.GetWindowTextW(hwnd, buffer, text_len + 1)
        return buffer.value
    return ""

def set_cursor_pos(x, y):
    """Move mouse to position"""
    user32.SetCursorPos(x, y)

def mouse_click(x, y):
    """Click at position"""
    virtual_x, virtual_y, screen_w, screen_h = get_screen_size()
    rel_x = int((x - virtual_x) / screen_w * 65535) if screen_w > 0 else 32767
    rel_y = int((y - virtual_y) / screen_h * 65535) if screen_h > 0 else 32767
    
    user32.mouse_event(0x0002, rel_x, rel_y, 0, 0)  # LEFTDOWN
    time.sleep(0.1)
    user32.mouse_event(0x0004, rel_x, rel_y, 0, 0)  # LEFTUP

def right_click(x, y):
    """Right click at position"""
    virtual_x, virtual_y, screen_w, screen_h = get_screen_size()
    rel_x = int((x - virtual_x) / screen_w * 65535) if screen_w > 0 else 32767
    rel_y = int((y - virtual_y) / screen_h * 65535) if screen_h > 0 else 32767
    
    user32.mouse_event(0x0008, rel_x, rel_y, 0, 0)  # RIGHTDOWN
    time.sleep(0.1)
    user32.mouse_event(0x0010, rel_x, rel_y, 0, 0)  # RIGHTUP

def main():
    print("=" * 60)
    print("HedgeVPN Auto Connect")
    print("=" * 60)
    
    virtual_x, virtual_y, screen_w, screen_h = get_screen_size()
    print(f"Screen: {screen_w}x{screen_h} at ({virtual_x}, {virtual_y})")
    
    # Tray area is usually at bottom-right
    tray_x = virtual_x + screen_w - 150
    tray_y = virtual_y + screen_h - 40
    
    print(f"\nTarget tray position: ({tray_x}, {tray_y})")
    
    # Move to tray and right-click
    print("\nMoving to tray area...")
    set_cursor_pos(tray_x, tray_y)
    time.sleep(0.5)
    
    print("Right-clicking tray icon...")
    right_click(tray_x, tray_y)
    time.sleep(1)
    
    # Try menu items
    menu_positions = [
        (tray_x + 50, tray_y - 30),
        (tray_x + 50, tray_y),
        (tray_x + 50, tray_y + 30),
    ]
    
    print("\nTrying menu items...")
    for i, (x, y) in enumerate(menu_positions):
        print(f"  Click {i+1}: ({x}, {y})")
        set_cursor_pos(x, y)
        time.sleep(0.3)
        mouse_click(x, y)
        time.sleep(0.5)
    
    print("\nChecking for HedgeVPN window...")
    time.sleep(2)
    
    # Enumerate windows
    print("\nAll windows:")
    def enum_windows(hwnd, lParam):
        text = get_window_text(hwnd)
        if text:
            print(f"  HWND={hwnd}: {text}")
        return True
    
    callback_type = CFUNCTYPE(bool, wintypes.HWND, wintypes.LPARAM)
    callback = callback_type(enum_windows)
    user32.EnumWindows(callback, 0)
    
    print("\n" + "=" * 60)
    print("Done! Please check if HedgeVPN is connected.")
    print("=" * 60)

if __name__ == "__main__":
    main()
