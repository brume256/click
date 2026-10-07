/// <reference lib="webworker" />

// deno-lint-ignore no-explicit-any
declare const chrome: any;

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })