# Habits Tracker — Project Knowledge

## Application overview

A personal tracker for habits, expenses, chores, and a shopping list. It should run in a browser and on Android, with platform-specific presentation. The user has Android Studio installed.

The app uses Expo with React Native and React Native Web so it can target Android and the browser from one codebase. Platform-specific app shells provide different navigation layouts.

## Main sections

- **Dashboard:** The front page, with statistics for the current month and calendar year.
- **Good Habits:** An independent tab for good habits. Users can add habit names.
- **Bad Habits:** An independent tab for bad habits. Users can add habit names.
- **Expenses:** A separate tab. Expense details and workflows will be planned separately.
- **Chores:** A separate tab. Users can add chore names.
- **Shopping List:** A separate tab in addition to the four original tracking sections. Item fields and completion behavior are still to be decided.

The dashboard should summarize the trackers for the month and year. Specific metrics and calculation rules remain to be defined. Numbers shown in design mockups are illustrative placeholders, not actual app data.

## Data and backup

- Save data locally on each device.
- Do not use cloud storage or automatic syncing.
- Provide manual JSON import and export for backups or moving data between devices.
- Backups contain the saved tracker names in a versioned `habits-tracker` JSON object with an export timestamp.
- Import validates the whole file before saving, then merges entries by ID; imported entries replace matching local IDs while local-only entries remain.
- Browser backups download as JSON and are selected through the browser file picker. Android exports through the system share sheet and imports through the system document picker.

## Navigation and actions

The Android design has five bottom navigation items: Good, Bad, Expenses, Chores, and Shopping.

The browser design has a persistent left sidebar with Dashboard, Good Habits, Bad Habits, Expenses, Chores, and Shopping List.
The selected browser navigation item uses the shared soft shadow token.
The browser sidebar brand is the text-only “Personal Tracker” title.
Browser and Android headers use the shared clay add icon and omit the placeholder profile-dot control.

The Options button with a custom clay gear appears only on Dashboard. Its popup contains Add, Import JSON, and Export JSON. The browser closes the popup on outside pointer presses by checking whether the event target is inside the Options container, leaving menu actions clickable. Add opens an overlay with selectable clay tiles for good habits, bad habits, expense types, and chores, plus a name field; saved names appear in their matching tabs. Tapping outside an open popup or overlay closes it.

## Reusable components and structure

All app icons use the shared custom soft-clay SVG component. Add missing icon variants there and reuse them across navigation, actions, and controls.
The Add modal's primary Save button uses a larger layered clay floppy-disk icon with a thin silhouette outline and no surrounding frame.
Import and Export use folded clay document cards with prominent downward and upward arrows.
Monthly and yearly dashboard cards reuse the Good, Bad, Expenses, and Chores soft-clay icons above their totals.

Organize the project into clear reusable areas, including:

- `Components/` for shared styled components, including dropdowns, text inputs, a calendar, and a date picker.
- `Resources/` for shared theme values, types, and other project resources.
- `Tabs/` for the dashboard and each tracking screen.

Prefer shared components where they fit, while allowing platform-specific presentation for Android and web.

## Current implementation status

The Add action opens a shared modal for named good habits, bad habits, expense types, and chores. Entries are stored locally with AsyncStorage and appear in their matching tabs. Manual JSON import/export covers these saved names; real dashboard calculations, completion tracking, and expense transactions are not connected yet.

## Visual direction

The approved direction is a calm, cartoon-inspired interface with restrained soft-clay 3D depth across components.

- Primary: `#000000`
- Secondary: `#008897`
- Gradient/accent colors: `#078665`, `#38242E`, `#24382B`
- Use warm off-white as the neutral background.
- Use a few soft, low-contrast abstract shapes around the edges; keep the main content easy to focus on.
- Use rounded cards, buttons, popup surfaces, and navigation with gentle shadows and matte finishes.
- The browser dashboard uses a raised card edge and palette-tinted shadows for restrained soft-clay depth; metric symbols remain unobstructed and centered.
- Keep text crisp and readable. Avoid busy patterns, strong visual effects, and heavy shadows.
- Use the shared Nunito font faces for readable, rounded-friendly text across browser and Android. The root waits for font loading before rendering the app.

The browser dashboard places the monthly and yearly summary cards side by side. The Android dashboard uses the same visual language in a phone layout with stacked summary cards.

## Open decisions

- Shopping list fields and completion behavior.
- Expense fields and workflows.
- Exact dashboard metrics and statistical calculations.
- JSON import behavior when data already exists.
