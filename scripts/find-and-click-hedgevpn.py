#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Find and click HedgeVPN connect button
"""
import time
import ctypes
from ctypes import wintypes
import subprocess

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

def get_screen_size():
    x = user32.GetSystemMetrics(76)  # SM_XVIRTUALSCREEN
    y = user32.GetSystemMetrics(77)  # SM_YVIRTUALSCREEN
    w = user32.GetSystemMetrics(78)  # SM_CXVIRTUALSCREEN
    h = user32.GetSystemMetrics(79)  # SM_CYVIRTUALSCREEN
    return x, y, w, h

def set_cursor_pos(x, y):
    user32.SetCursorPos(x, y)

def mouse_click(x, y):
    virtual_x, virtual_y, screen_w, screen_h = get_screen_size()
    rel_x = int((x - virtual_x) / screen_w * 65535) if screen_w > 0 else 32767
    rel_y = int((y - virtual_y) / screen_h * 65535) if screen_h > 0 else 32767
    
    user32.mouse_event(0x0002, rel_x, rel_y, 0, 0)  # LEFTDOWN
    time.sleep(0.1)
    user32.mouse_event(0x0004, rel_x, rel_y, 0, 0)  # LEFTUP

def find_window_by_class(class_name):
    hwnd = user32.FindWindowW(class_name, None)
    return hwnd

def enum_windows(hwnd, lParam):
    """Enum all windows and print their info"""
    text_len = user32.GetWindowTextLengthW(hwnd)
    if text_len > 0:
        buffer = ctypes.create_unicode_buffer(text_len + 1)
        user32.GetWindowTextW(hwnd, buffer, text_len + 1)
        text = buffer.value
        
        if "hedge" in text.lower() or "vpn" in text.lower():
            rect = wintypes.RECT()
            user32.GetWindowRect(hwnd, ctypes.byref(rect))
            
            # Store for later use
            enum_windows.found_window = (hwnd, text, rect)
            return False  # Stop enumeration
    return True

enum_windows.found_window = None

def main():
    print("=" * 60)
    print("Finding HedgeVPN Window")
    print("=" * 60)
    
    # Enumerate all windows
    callback_type = ctypes.CFUNCTYPE(bool, wintypes.HWND, wintypes.LPARAM)
    callback = callback_type(enum_windows)
    user32.EnumWindows(callback, 0)
    
    if enum_windows.found_window:
        hwnd, title, rect = enum_windows.found_window
        print(f"✅ Found window: {title}")
        print(f"   Position: ({rect.left}, {rect.top}) to ({rect.right}, {rect.bottom})")
        print(f"   Size: {rect.right - rect.left}x{rect.bottom - rect.top}")
        
        # Calculate click position (connect button is usually in center)
        width = rect.right - rect.left
        height = rect.bottom - rect.top
        center_x = rect.left + width // 2
        center_y = rect.top + height // 2
        
        print(f"\n   Center: ({center_x}, {center_y})")
        
        # Move to window and click
        print(f"\nMoving to window...")
        set_cursor_pos(center_x, center_y)
        time.sleep(0.5)
        
        print(f"Clicking connect button...")
        mouse_click(center_x, center_y)
        
        # Wait and check connection status
        print("\nWaiting for connection...")
        time.sleep(3)
        
        # Test connection
        import urllib.request
        try:
            resp = urllib.request.urlopen("https://httpbin.org/ip", timeout=5)
            ip_info = resp.read().decode()
            print(f"✅ Connected! IP: {ip_info}")
        except Exception as e:
            print(f"❌ Still not connected: {e}")
            print("Please check HedgeVPN status manually.")
    else:
        print("❌ HedgeVPN window not found!")
        print("\nPlease make sure HedgeVPN is running and visible.")
        print("The window should appear after clicking the tray icon.")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
