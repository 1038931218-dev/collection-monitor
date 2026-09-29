using System;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Threading;

class Program
{
    [DllImport("user32.dll")]
    static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    
    [DllImport("user32.dll")]
    static extern bool SetForegroundWindow(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    
    [DllImport("user32.dll")]
    static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, IntPtr dwExtraInfo);
    
    [DllImport("user32.dll")]
    static extern bool ClientToScreen(IntPtr hWnd, out POINT lpPoint);
    
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
    
    [StructLayout(LayoutKind.Sequential)]
    public struct POINT
    {
        public int X;
        public int Y;
    }
    
    const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    const uint MOUSEEVENTF_LEFTUP = 0x0004;
    
    static void Main(string[] args)
    {
        Console.WriteLine("Looking for HedgeVPN window...");
        
        // 查找窗口
        IntPtr hWnd = FindWindow(null, "HedgeVPN");
        if (hWnd == IntPtr.Zero)
        {
            Console.WriteLine("HedgeVPN window not found!");
            return;
        }
        
        Console.WriteLine("Found HedgeVPN window!");
        
        // 激活窗口
        SetForegroundWindow(hWnd);
        Thread.Sleep(500);
        
        // 获取窗口位置
        RECT rect;
        GetWindowRect(hWnd, out rect);
        int centerX = (rect.Left + rect.Right) / 2;
        int centerY = (rect.Top + rect.Bottom) / 2;
        
        Console.WriteLine($"Window position: ({rect.Left}, {rect.Top}) to ({rect.Right}, {rect.Bottom})");
        
        // 尝试点击中心区域（假设连接按钮在窗口中央）
        Console.WriteLine("Clicking at center of window...");
        MouseClick(centerX, centerY);
        
        Console.WriteLine("Done! Please check if connected.");
    }
    
    static void MouseClick(int x, int y)
    {
        // 移动到位置
        Cursor.Position = new System.Drawing.Point(x, y);
        Thread.Sleep(100);
        
        // 左键按下
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, IntPtr.Zero);
        Thread.Sleep(100);
        
        // 左键释放
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, IntPtr.Zero);
    }
}
