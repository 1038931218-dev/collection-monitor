#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Find and click HedgeVPN tray icon to connect
"""
import time
import ctypes
from ctypes import wintypes
import subprocess

user32 = ctypes.windll.user32
shell32 = ctypes.windll.shell32

def find_tray_window():
    """Find the system tray window"""
    # Try to find tray window
    hwnd = user32.FindWindowW("Shell_TrayWnd", None)
    if hwnd:
        print(f"Found Shell_TrayWnd: {hwnd}")
        # Find notification area
        notif = user32.FindWindowExW(hwnd, None, "TrayNotifyWnd", None)
        if notif:
            print(f"Found TrayNotifyWnd: {notif}")
            # Find SysPager or other child
            pager = user32.FindWindowExW(notif, None, "SysPager", None)
            if pager:
                print(f"Found SysPager: {pager}")
                toolbar = user32.FindWindowExW(pager, None, "ToolbarWindow32", None)
                if toolbar:
                    print(f"Found ToolbarWindow32: {toolbar}")
                    return toolbar
    return None

def click_tray_icon(x, y):
    """Click at screen coordinates (tray area)"""
    # Convert to mouse coordinates
    user32.SetCursorPos(x, y)
    time.sleep(0.1)
    
    # Left click down
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.1)
    
    # Left click up
    user32.mouse_event(0x0004, 0, 0, 0, 0)

def main():
    print("=" * 60)
    print("HedgeVPN Tray Clicker")
    print("=" * 60)
    
    # Get screen size
    screen_w = user32.GetSystemMetrics(0)
    screen_h = user32.GetSystemMetrics(1)
    print(f"Screen size: {screen_w}x{screen_h}")
    
    # Tray is usually at bottom-right
    tray_x = screen_w - 100
    tray_y = screen_h - 30
    
    print(f"\nTarget position: ({tray_x}, {tray_y})")
    
    # Move to tray and click
    print("\nMoving to tray area...")
    user32.SetCursorPos(tray_x, tray_y)
    time.sleep(0.5)
    
    # Right-click to open context menu
    print("Right-clicking tray icon...")
    user32.mouse_event(0x0008, 0, 0, 0, 0)  # MOUSEEVENTF_RIGHTDOWN
    time.sleep(0.1)
    user32.mouse_event(0x0010, 0, 0, 0, 0)  # MOUSEEVENTF_RIGHTUP
    time.sleep(1)
    
    # Try to find and click HedgeVPN menu item
    print("\nLooking for HedgeVPN in menu...")
    
    # Alternative: Just left-click to open the app
    print("Left-clicking tray icon...")
    user32.mouse_event(0x0002, 0, 0, 0, 0)  # MOUSEEVENTF_LEFTDOWN
    time.sleep(0.1)
    user32.mouse_event(0x0004, 0, 0, 0, 0)  # MOUSEEVENTF_LEFTUP
    time.sleep(1)
    
    # Check if window appeared
    print("\nChecking for HedgeVPN window...")
    time.sleep(2)
    
    result = subprocess.run([
        'powershell', '-NoProfile', '-Command',
        "Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | ForEach-Object { Write-Host $_.ProcessName ': ' $_.MainWindowTitle }"
    ], capture_output=True, text=True)
    
    print(result.stdout)
    
    # If window appeared, try to find and click connect button
    if "Hedge" in result.stdout or "VPN" in result.stdout:
        print("\n✅ HedgeVPN window found!")
        print("Please check if the connect button is visible.")
    else:
        print("\n⚠️ HedgeVPN window not found. Try starting it manually.")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
