/// <reference types="chrome" />

chrome.sidePanel.onOpened.addListener(() => chrome.storage.session.set({ sidePanel: true }))
chrome.sidePanel.onClosed.addListener(() => chrome.storage.session.set({ sidePanel: false }))

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

