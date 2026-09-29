#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Find and click HedgeVPN connect button - FINAL VERSION
"""
import time
import ctypes
from ctypes import wintypes
import subprocess
import os

user32 = ctypes.windll.user32

def get_screen_size():
    x = user32.GetSystemMetrics(76)
    y = user32.GetSystemMetrics(77)
    w = user32.GetSystemMetrics(78)
    h = user32.GetSystemMetrics(79)
    return x, y, w, h

def set_cursor_pos(x, y):
    user32.SetCursorPos(x, y)

def mouse_click(x, y):
    virtual_x, virtual_y, screen_w, screen_h = get_screen_size()
    rel_x = int((x - virtual_x) / screen_w * 65535) if screen_w > 0 else 32767
    rel_y = int((y - virtual_y) / screen_h * 65535) if screen_h > 0 else 32767
    user32.mouse_event(0x0002, rel_x, rel_y, 0, 0)
    time.sleep(0.1)
    user32.mouse_event(0x0004, rel_x, rel_y, 0, 0)

def find_window():
    """Find HedgeVPN window"""
    # Try to find by title
    hwnd = user32.FindWindowW(None, "HedgeVPN")
    if hwnd:
        return hwnd, "HedgeVPN"
    
    # Try to find by class
    hwnd = user32.FindWindowW("HedgeVPN", None)
    if hwnd:
        return hwnd, "HedgeVPN (class)"
    
    # Enumerate all windows
    found_hwnd = [None]
    found_text = [""]
    
    def enum_proc(hwnd, lParam):
        buffer = ctypes.create_unicode_buffer(256)
        user32.GetWindowTextW(hwnd, buffer, 256)
        text = buffer.value
        if "hedge" in text.lower() or "vpn" in text.lower():
            found_hwnd[0] = hwnd
            found_text[0] = text
            return False  # Stop
        return True
    
    callback_type = ctypes.CFUNCTYPE(bool, wintypes.HWND, wintypes.LPARAM)
    callback = callback_type(enum_proc)
    user32.EnumWindows(callback, 0)
    
    if found_hwnd[0]:
        return found_hwnd[0], found_text[0]
    
    return None, None

def main():
    print("=" * 60)
    print("Phase 6.5 - Auto Connect to HedgeVPN")
    print("=" * 60)
    
    # Check if HedgeVPN is running
    result = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq HedgeVPN.exe'], 
                          capture_output=True, text=True, encoding='utf-8', errors='ignore')
    
    if 'HedgeVPN.exe' not in result.stdout:
        print("Starting HedgeVPN...")
        try:
            subprocess.Popen([r"C:\Program Files\HedgeVPN\HedgeVPN.exe"])
            time.sleep(3)
        except Exception as e:
            print(f"Failed to start: {e}")
            return
    
    print("✅ HedgeVPN is running")
    
    # Find window
    hwnd, title = find_window()
    
    if not hwnd:
        print("❌ Window not found. Trying tray...")
        # Try tray area
        virtual_x, virtual_y, screen_w, screen_h = get_screen_size()
        tray_x = virtual_x + screen_w - 150
        tray_y = virtual_y + screen_h - 40
        
        print(f"Tray position: ({tray_x}, {tray_y})")
        set_cursor_pos(tray_x, tray_y)
        time.sleep(0.5)
        
        # Right click
        user32.mouse_event(0x0008, 0, 0, 0, 0)
        time.sleep(0.1)
        user32.mouse_event(0x0010, 0, 0, 0, 0)
        time.sleep(1)
        
        # Try menu items
        for i in range(5):
            y_offset = (i - 2) * 25
            set_cursor_pos(tray_x + 50, tray_y + y_offset)
            time.sleep(0.2)
            mouse_click(tray_x + 50, tray_y + y_offset)
            time.sleep(0.5)
        
        time.sleep(2)
        hwnd, title = find_window()
    
    if hwnd:
        print(f"✅ Found window: {title}")
        
        # Get window rect
        rect = wintypes.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        width = rect.right - rect.left
        height = rect.bottom - rect.top
        
        print(f"Position: ({rect.left}, {rect.top})")
        print(f"Size: {width}x{height}")
        
        # Connect button is usually in center or lower center
        center_x = rect.left + width // 2
        center_y = rect.top + height // 2 + 50
        
        print(f"\nClicking at: ({center_x}, {center_y})")
        set_cursor_pos(center_x, center_y)
        time.sleep(0.5)
        mouse_click(center_x, center_y)
        
        # Wait for connection
        print("\nWaiting for VPN connection...")
        time.sleep(5)
        
        # Test connection
        print("\nTesting connection...")
        try:
            import urllib.request
            resp = urllib.request.urlopen("https://httpbin.org/ip", timeout=10)
            ip_info = resp.read().decode()
            print(f"✅ Connected! IP: {ip_info.strip()}")
            
            # Now post to Reddit
            print("\n" + "=" * 60)
            print("VPN CONNECTED! Starting Reddit post...")
            print("=" * 60)
            
            os.system('python scripts/post-reddit-api.py')
            
        except Exception as e:
            print(f"❌ Still not connected: {e}")
    else:
        print("\n❌ Could not find or open HedgeVPN window")
        print("Please check the application manually.")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
