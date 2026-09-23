using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

internal static class Launcher
{
    [STAThread]
    private static void Main()
    {
        string baseDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
        string python = Path.Combine(baseDir, "runtime", "pythonw.exe");
        string script = Path.Combine(baseDir, "app", "desktop.py");

        if (!File.Exists(python) || !File.Exists(script))
        {
            MessageBox.Show(
                "应用文件不完整。请先完整解压 ZIP，再打开程序；app 和 runtime 文件夹需要保留。",
                "墨转 · Markdown 工作台",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
            return;
        }

        try
        {
            ProcessStartInfo startInfo = new ProcessStartInfo();
            startInfo.FileName = python;
            startInfo.Arguments = "-E -s -B \"" + script + "\"";
            startInfo.WorkingDirectory = Path.Combine(baseDir, "app");
            startInfo.UseShellExecute = false;
            startInfo.CreateNoWindow = true;
            Process child = Process.Start(startInfo);
            child.WaitForExit();
            if (child.ExitCode != 0)
            {
                MessageBox.Show(
                    "应用意外退出。请检查是否完整解压了便携包，再重试。",
                    "墨转 · Markdown 工作台",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
        catch (Exception error)
        {
            MessageBox.Show(
                "无法启动应用。\r\n\r\n" + error.Message,
                "墨转 · Markdown 工作台",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
        }
    }
}
