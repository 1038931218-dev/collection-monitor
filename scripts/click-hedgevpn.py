#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Click HedgeVPN Connect button using mouse automation
"""
import time
import ctypes
from ctypes import wintypes

# Windows API constants
SM_XVIRTUALSCREEN = 76
SM_YVIRTUALSCREEN = 77
SM_CXVIRTUALSCREEN = 78
SM_CYVIRTUALSCREEN = 79

user32 = ctypes.windll.user32

def get_screen_size():
    """Get virtual screen size"""
    x = user32.GetSystemMetrics(SM_XVIRTUALSCREEN)
    y = user32.GetSystemMetrics(SM_YVIRTUALSCREEN)
    w = user32.GetSystemMetrics(SM_CXVIRTUALSCREEN)
    h = user32.GetSystemMetrics(SM_CYVIRTUALSCREEN)
    return x, y, w, h

def find_window_by_name(name):
    """Find window by title"""
    hwnd = user32.FindWindowW(None, name)
    if hwnd:
        return hwnd
    # Try partial match
    hwnd = user32.FindWindowW(None, None)
    while hwnd:
        text_len = user32.GetWindowTextLengthW(hwnd)
        if text_len > 0:
            buffer = ctypes.create_unicode_buffer(text_len + 1)
            user32.GetWindowTextW(hwnd, buffer, text_len + 1)
            if name.lower() in buffer.value.lower():
                print(f"Found window: {buffer.value}")
                return hwnd
        hwnd = user32.GetWindow(hwnd, 2)  # GW_HWNDNEXT
    return None

def get_window_rect(hwnd):
    """Get window position and size"""
    rect = wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(rect))
    return rect

def mouse_event(dwFlags, dx, dy, dwData, dwExtraInfo):
    """Simulate mouse event"""
    user32.mouse_event(dwFlags, dx, dy, dwData, dwExtraInfo)

def click_at(x, y):
    """Click at screen coordinates"""
    # Convert to absolute screen coordinates
    virtual_x, virtual_y, screen_w, screen_h = get_screen_size()
    
    # Calculate relative position
    rel_x = int((x - virtual_x) / screen_w * 65535) if screen_w > 0 else 32767
    rel_y = int((y - virtual_y) / screen_h * 65535) if screen_h > 0 else 32767
    
    # Move mouse
    user32.SetCursorPos(x, y)
    time.sleep(0.1)
    
    # Left button down
    mouse_event(0x0002, rel_x, rel_y, 0, 0)
    time.sleep(0.1)
    
    # Left button up
    mouse_event(0x0004, rel_x, rel_y, 0, 0)

def main():
    print("=" * 60)
    print("HedgeVPN Auto Connect")
    print("=" * 60)
    
    # Find HedgeVPN window
    print("\nLooking for HedgeVPN window...")
    hwnd = find_window_by_name("HedgeVPN")
    
    if not hwnd:
        print("❌ HedgeVPN window not found!")
        print("Please make sure HedgeVPN is running.")
        return
    
    print(f"✅ Found window: {hwnd}")
    
    # Get window rect
    rect = get_window_rect(hwnd)
    print(f"Window position: ({rect.left}, {rect.top}) to ({rect.right}, {rect.bottom})")
    
    # Calculate center of window
    width = rect.right - rect.left
    height = rect.bottom - rect.top
    center_x = rect.left + width // 2
    center_y = rect.top + height // 2
    
    print(f"Window center: ({center_x}, {center_y})")
    
    # Bring window to front
    user32.ShowWindow(hwnd, 9)  # SW_RESTORE
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.5)
    
    # Try clicking at different positions to find the connect button
    print("\nTrying to click connect button...")
    
    # Connect button is usually in the center or lower center of the window
    positions = [
        (center_x, center_y),           # Center
        (center_x, center_y + 80),      # Below center
        (center_x, center_y + 120),     # Lower area
        (center_x + 100, center_y + 80), # Right side
        (center_x - 100, center_y + 80), # Left side
    ]
    
    for i, (x, y) in enumerate(positions):
        print(f"  Click {i+1}: ({x}, {y})")
        click_at(x, y)
        time.sleep(1)
    
    # Check if connection status changed (look for green indicator)
    print("\nChecking connection status...")
    time.sleep(2)
    
    # Take screenshot to verify
    print("Taking screenshot to verify...")
    # Use PowerShell to take screenshot
    import subprocess
    result = subprocess.run([
        'powershell', '-Command',
        'Add-Type -AssemblyName System.Windows.Forms; '
        '$bmp = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); '
        '$g = [System.Drawing.Graphics]::FromImage($bmp); '
        '$g.CopyFromScreen([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Location, [System.Drawing.Point]::Empty, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Size); '
        '$bmp.Save("hedgevpn-status.png")'
    ], capture_output=True, text=True)
    
    if Path("hedgevpn-status.png").exists():
        print("✅ Screenshot saved: hedgevpn-status.png")
    else:
        print("⚠️ Could not take screenshot")
    
    print("\n" + "=" * 60)
    print("Done! Please check if HedgeVPN is connected.")
    print("If not, please click the connect button manually.")
    print("=" * 60)

if __name__ == "__main__":
    from pathlib import Path
    main()
