#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Start HedgeVPN and click connect button
"""
import time
import subprocess
import ctypes
from ctypes import wintypes

user32 = ctypes.windll.user32

def get_screen_size():
    """Get virtual screen size"""
    x = user32.GetSystemMetrics(76)
    y = user32.GetSystemMetrics(77)
    w = user32.GetSystemMetrics(78)
    h = user32.GetSystemMetrics(79)
    return x, y, w, h

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

def start_hedgevpn():
    """Start HedgeVPN application"""
    try:
        subprocess.Popen([r"C:\Program Files\HedgeVPN\HedgeVPN.exe"])
        time.sleep(3)
        print("✅ HedgeVPN started")
        return True
    except Exception as e:
        print(f"❌ Failed to start HedgeVPN: {e}")
        return False

def main():
    print("=" * 60)
    print("HedgeVPN Auto Connect")
    print("=" * 60)
    
    # Start HedgeVPN
    if not start_hedgevpn():
        return
    
    # Get screen size
    virtual_x, virtual_y, screen_w, screen_h = get_screen_size()
    print(f"Screen: {screen_w}x{screen_h}")
    
    # Wait for window to appear
    print("\nWaiting for HedgeVPN window...")
    time.sleep(2)
    
    # Try to find HedgeVPN window
    def enum_windows(hwnd, lParam):
        buffer = ctypes.create_unicode_buffer(256)
        user32.GetWindowTextW(hwnd, buffer, 256)
        text = buffer.value
        if "hedge" in text.lower() or "vpn" in text.lower():
            print(f"Found window: {text} (HWND={hwnd})")
            # Get window rect
            rect = wintypes.RECT()
            user32.GetWindowRect(hwnd, ctypes.byref(rect))
            width = rect.right - rect.left
            height = rect.bottom - rect.top
            center_x = rect.left + width // 2
            center_y = rect.top + height // 2
            print(f"Window position: ({rect.left}, {rect.top}) size: {width}x{height}")
            print(f"Center: ({center_x}, {center_y})")
            
            # Click center (connect button is usually in center)
            print(f"\nClicking at ({center_x}, {center_y})...")
            set_cursor_pos(center_x, center_y)
            time.sleep(0.5)
            mouse_click(center_x, center_y)
            
            # Wait for connection
            print("Waiting for connection...")
            time.sleep(3)
            
            # Check if connected (look for green indicator)
            # Click again on connection status area
            print("Checking connection status...")
            time.sleep(2)
            return False  # Stop enumeration
        return True
    
    callback_type = ctypes.CFUNCTYPE(bool, wintypes.HWND, wintypes.LPARAM)
    callback = callback_type(enum_windows)
    user32.EnumWindows(callback, 0)
    
    print("\n" + "=" * 60)
    print("Please check if HedgeVPN is connected.")
    print("=" * 60)

if __name__ == "__main__":
    main()
