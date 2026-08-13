import React, { useEffect, useState } from "react";
import {
  Keyboard,
  Play,
  Square,
  Volume2,
  Settings,
  Edit,
  Monitor,
} from "lucide-react";

export default function KeyboardShortcutCenter() {
  const [message, setMessage] = useState("Press a shortcut...");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;

      if (e.key === "F1") {
        e.preventDefault();
        setMessage("Keyboard Shortcut Help Opened");
      }

      switch (e.key.toLowerCase()) {
        case "r":
          setMessage("Start Recording");
          break;

        case "s":
          setMessage("Stop Recording");
          break;

        case "p":
          setMessage("Speak Text");
          break;

        case "l":
          setMessage("Live Mode Toggled");
          break;

        case "e":
          setMessage("Editor Focused");
          break;

        case "g":
          setMessage("Settings Opened");
          break;

        case "?":
          setMessage("Shortcut Help Opened");
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const shortcuts = [
    {
      key: "R",
      action: "Start Recording",
      icon: <Play size={20} />,
    },
    {
      key: "S",
      action: "Stop Recording",
      icon: <Square size={20} />,
    },
    {
      key: "P",
      action: "Speak Text",
      icon: <Volume2 size={20} />,
    },
    {
      key: "L",
      action: "Toggle Live Mode",
      icon: <Monitor size={20} />,
    },
    {
      key: "G",
      action: "Open Settings",
      icon: <Settings size={20} />,
    },
    {
      key: "E",
      action: "Focus Text Editor",
      icon: <Edit size={20} />,
    },
    {
      key: "? / F1",
      action: "Open Shortcut Help",
      icon: <Keyboard size={20} />,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold flex items-center gap-2 mb-3">
        <Keyboard />
        Accessibility Keyboard Shortcut Center
      </h1>

      <p className="text-gray-500 mb-8">
        Use keyboard shortcuts for faster navigation and improved accessibility.
      </p>

      <div className="rounded-xl border p-5 mb-8 bg-white dark:bg-neutral-900 shadow">
        <h2 className="font-semibold text-lg mb-2">
          Current Action
        </h2>

        <p className="text-blue-600 font-medium">
          {message}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {shortcuts.map((item) => (
          <div
            key={item.key}
            className="rounded-xl border p-5 bg-white dark:bg-neutral-900 shadow flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span>{item.action}</span>
            </div>

            <kbd className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded font-bold">
              {item.key}
            </kbd>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-xl bg-blue-50 dark:bg-neutral-800 p-5">
        <h3 className="font-semibold mb-2">
          Accessibility Notes
        </h3>

        <ul className="list-disc ml-6 space-y-2">
          <li>All shortcuts work globally.</li>
          <li>Input fields ignore shortcuts to avoid typing conflicts.</li>
          <li>Shortcut help is available using ? or F1.</li>
          <li>Uses browser-friendly keys to reduce conflicts.</li>
        </ul>
      </div>
    </div>
  );
}