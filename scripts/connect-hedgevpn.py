#!/usr/bin/env python3
"""
Simple HedgeVPN connect script using ctypes
"""

import ctypes
import time
from ctypes import wintypes

# Windows API constants
WM_CLOSE = 0x0010
SW_RESTORE = 9
SW_SHOW = 5
WM_LBUTTONDOWN = 0x0201
WM_LBUTTONUP = 0x0202

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

def find_hedge_window():
    """Find HedgeVPN main window"""
    # Try to find window by class or title
    hwnd = user32.FindWindowW(None, "HedgeVPN")
    if hwnd:
        return hwnd
    
    # Try by process name
    hwnd = user32.FindWindowW(None, None)
    while hwnd:
        pid = wintypes.DWORD()
        thread_id = user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        
        # Get window text
        text_len = user32.GetWindowTextLengthW(hwnd)
        if text_len > 0:
            buffer = ctypes.create_unicode_buffer(text_len + 1)
            user32.GetWindowTextW(hwnd, buffer, text_len + 1)
            if "hedge" in buffer.value.lower():
                print(f"Found window: {buffer.value}")
                return hwnd
        
        hwnd = user32.GetWindow(hwnd, 2)  # GW_HWNDNEXT
    
    return None

def get_window_rect(hwnd):
    """Get window position and size"""
    rect = wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(rect))
    return rect

def click_at(hwnd, x, y):
    """Click at screen coordinates"""
    # Convert to LPARAM
    lparam = (y << 16) | x
    user32.PostMessageW(hwnd, WM_LBUTTONDOWN, 1, lparam)
    time.sleep(0.1)
    user32.PostMessageW(hwnd, WM_LBUTTONUP, 0, lparam)

def main():
    print("=" * 60)
    print("HedgeVPN Auto Connect")
    print("=" * 60)
    
    # Find window
    print("\nLooking for HedgeVPN window...")
    hwnd = find_hedge_window()
    
    if not hwnd:
        print("❌ HedgeVPN window not found!")
        print("Please make sure HedgeVPN is running and try again.")
        return
    
    print(f"✅ Found window: {hwnd}")
    
    # Get window rect
    rect = get_window_rect(hwnd)
    print(f"Window position: ({rect.left}, {rect.top}) to ({rect.right}, {rect.bottom})")
    
    # Calculate center
    width = rect.right - rect.left
    height = rect.bottom - rect.top
    center_x = rect.left + width // 2
    center_y = rect.top + height // 2
    
    print(f"Center: ({center_x}, {center_y})")
    
    # Bring to front
    user32.ShowWindow(hwnd, SW_RESTORE)
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.5)
    
    # Try clicking at different positions to find the connect button
    print("\nTrying to click connect button...")
    
    # Try various positions (connect button is usually in center or lower center)
    positions = [
        (center_x, center_y),  # Center
        (center_x, center_y + 50),  # Slightly below center
        (center_x, center_y + 100),  # Lower center
        (center_x + 100, center_y),  # Right of center
        (center_x - 100, center_y),  # Left of center
    ]
    
    for i, (x, y) in enumerate(positions):
        print(f"  Click {i+1}: ({x}, {y})")
        click_at(hwnd, x, y)
        time.sleep(1)
    
    print("\nDone! Please check if HedgeVPN is connected.")
    print("If not connected, please click the connect button manually.")
    
    input("\nPress Enter to exit...")

if __name__ == "__main__":
    main()
