# CleanType Native

A minimalist freewriting app built entirely in **pure Rust** using [egui](https://github.com/emilk/egui).

This is a native rewrite of the original Tauri-based CleanType, offering significantly lower memory usage and faster startup times.

## Features

- ✍️ **Distraction-free writing** - Clean, minimal interface focused on writing
- 📁 **Multiple entries** - Create and manage multiple writing entries
- 🔍 **Search** - Find entries by content or title
- ⏱️ **Timer** - Set timed writing sessions (5-60 minutes)
- 🎨 **Themes** - Light and dark mode support
- 🔤 **Multiple fonts** - 8 different font styles + random
- 📏 **Adjustable font size** - 16px to 48px presets, or Ctrl+Scroll
- ↩️ **Undo/Redo** - Full undo/redo support
- 💾 **Auto-save** - Content is automatically saved
- ⌨️ **Keyboard shortcuts** - Full keyboard navigation

## Performance Comparison

| Metric | Tauri Version | Native Version |
|--------|--------------|----------------|
| Memory usage | ~80-150 MB | ~15-25 MB |
| Startup time | 1-2 seconds | <100ms |
| Binary size | ~15 MB | ~8 MB |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save to history |
| `Ctrl + N` | Create new entry |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + /` | Show shortcuts |
| `Ctrl + Scroll` | Change font size |
| `F11` | Toggle fullscreen |
| `Escape` | Close panels |

## Building

### Prerequisites

- [Rust](https://rustup.rs/) (stable, 1.70+)

### Development

```bash
cd cleantype-native
cargo run
```

### Release Build

```bash
cargo build --release
```

The optimized binary will be at `target/release/cleantype.exe` (Windows) or `target/release/cleantype` (Linux/macOS).

## Data Storage

Your entries are stored in:
- **Windows**: `%APPDATA%\starknightt\cleantype\data\`
- **macOS**: `~/Library/Application Support/com.starknightt.cleantype/`
- **Linux**: `~/.local/share/cleantype/`

## License

MIT License - see [LICENSE](../LICENSE) for details.

