# 🚀 Quick Testing Guide - Agent Monitoring

## ⚡ 5-Minute Test

**Everything is ready! Here's how to test in 5 minutes:**

### 1. **Run the Demo Script**
```bash
./demo-monitoring.sh
```
Choose option `5` for the full sequence, or individual tests:

### 2. **Manual Quick Tests**

**Test Stream Mode:**
```bash
NODE_ENV=development node dist/index.js stream
# Wait 5 seconds to see sample events, then Ctrl+C
```

**Test Dashboard Mode:**
```bash
NODE_ENV=development node dist/index.js monitor
# Press 'h' for help, 'q' to quit
```

**Test Help:**
```bash
node dist/index.js --help
# Should show monitoring commands
```

## 🎯 What to Look For

### ✅ **Stream Mode Success Indicators:**
- Shows startup message: "📡 Starting event stream..."
- Events appear with timestamps and icons: `🔍 🧠 💡`
- Confidence percentages: `(85%)`
- Indented reasoning: `└─ Files are cohesive...`
- Clean exit with Ctrl+C

### ✅ **Dashboard Mode Success Indicators:**
- Four-panel terminal interface
- Status bar at top with agent info
- Live activity log on left
- Decision tree on right
- Controls panel at bottom
- Responsive to keyboard: `[p]` `[h]` `[q]`

### ✅ **Expected Sample Events:**
```
🔍 Scanning project for changes... (100%)
🧠 Analyzing changes: 3 new TypeScript files (85%)
💡 Suggesting: Commit monitoring infrastructure (92%)
```

## 🐛 Common Issues & Quick Fixes

**Dashboard looks garbled:**
- Increase terminal size (minimum 80x24)
- Try: `node dist/index.js monitor --no-color`

**No sample events:**
- Ensure: `NODE_ENV=development`
- Wait 5+ seconds

**"Command not found":**
- Run: `npm run build` first

## 🎉 Success Criteria

✅ Help shows monitoring commands  
✅ Stream mode displays events with icons  
✅ Dashboard shows four-panel interface  
✅ Keyboard controls work (h, p, q)  
✅ Sample events generate automatically  
✅ Clean exit and no crashes  

## 📋 Testing Checklist

- [ ] `./demo-monitoring.sh` completes without errors
- [ ] Stream mode shows formatted events
- [ ] Dashboard mode displays properly
- [ ] Keyboard controls respond
- [ ] Help system works
- [ ] All modes exit cleanly

**Ready for production testing!** 🚀

## Next Steps

After basic testing works:
1. Test with real git repositories
2. Test integration with MCP server
3. Test different terminal emulators
4. Stress test with many events
5. Test on different operating systems