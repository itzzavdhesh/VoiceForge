import React from 'react';

export default function DeviceSelector({ devices, selectedDeviceId, onChange }) {
  // If no devices are passed or devices haven't loaded yet, don't render the dropdown.
  if (!devices || devices.length === 0) return null;

  return (
    <select
      value={selectedDeviceId || ""}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm bg-white dark:bg-black border border-neutral-200 dark:border-border rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-moss/40 dark:focus:ring-glow/40 text-neutral-700 dark:text-neutral-200 cursor-pointer shadow-sm max-w-[250px] truncate appearance-none"
      aria-label="Select camera"
      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
    >
      {devices.map((device, index) => (
        <option key={device.deviceId} value={device.deviceId}>
          {device.label || `Camera ${index + 1}`}
        </option>
      ))}
    </select>
  );
}
