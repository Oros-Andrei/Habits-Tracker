# Habits Tracker — Project Knowledge

## Application overview

A personal tracker for habits, expenses, chores, and a shopping list. It should run in a browser and on Android, with platform-specific presentation. The user has Android Studio installed.

The app uses Expo with React Native and React Native Web so it can target Android and the browser from one codebase. Platform-specific app shells provide different navigation layouts.

## Main sections

- **Dashboard:** The front page, with statistics for the current month and calendar year.
- **Good Habits:** An independent tab for good habits. Users can add habit names.
- **Bad Habits:** An independent tab for bad habits. Users can add habit names.
- **Expenses:** A separate tab. Expense details and workflows will be planned separately.
- **Chores:** A separate tab with an active list, today's/overdue chores, and a planning calendar for one-off and recurring tasks.
- **Shopping List:** A separate tab in addition to the four original tracking sections. Item fields and completion behavior are still to be decided.

The dashboard summarizes the trackers for the month and year. Good Habits totals count completed habit-days, Bad Habits totals count recorded occurrence-days, and Chores totals count actual completions in the current local month and calendar year. Expense calculations remain to be defined. Numbers shown in design mockups are illustrative placeholders, not actual app data.

## Data and backup

- Save data locally on each device.
- Do not use cloud storage or automatic syncing.
- Provide manual JSON import and export for backups or moving data between devices.
- Backups contain saved tracker names, good- and bad-habit tracking, and chore membership, plans, and actual completion dates in a versioned `habits-tracker` JSON object with an export timestamp. Exports use version 4; imports accept versions 1–4. Older apps reject version 4 rather than silently dropping chore history. Device notification identifiers and browser delivery markers are not exported.
- Import validates the whole file before saving, then merges entries by ID. Imported names and types replace matching IDs while local-only entries remain. For matching habits or chores, supplied tracking replaces local tracking; older name-only entries preserve that category's local membership, plans, and history. Chore validation checks real dates, 24-hour times, repeat intervals/bases, unique plan/completion IDs, and completion links.
- Browser backups download as JSON and are selected through the browser file picker. Android exports through the system share sheet and imports through the system document picker.

## Navigation and actions

The Android design has five bottom navigation items: Good, Bad, Expenses, Chores, and Shopping.

The browser design has a persistent left sidebar with Dashboard, Good Habits, Bad Habits, Expenses, Chores, and Shopping List.
The selected browser navigation item uses the shared soft shadow token.
The browser sidebar brand is the text-only “Personal Tracker” title.
Browser and Android headers use the shared clay add icon and omit the placeholder profile-dot control.

The Dashboard Options button with a custom clay gear contains Add, Import JSON, and Export JSON. Good Habits and Bad Habits each have an Options button beside the list heading for adding saved habits, removing list members while preserving history, and creating names limited to their own category. The Dashboard browser popup closes on outside pointer presses by checking whether the event target is inside its Options container, leaving menu actions clickable. Add opens an overlay with selectable clay tiles for good habits, bad habits, expense types, and chores, plus a name field; saved names appear in their matching tabs. Tapping outside an open popup or overlay closes it.

## Reusable components and structure

All app icons use the shared SectionIcon component. Most icons are soft-clay SVGs; Good Habits and Bad Habits use the approved generated Guardian angel and matching adult female plum demon from src/Resources/habit-characters.png. SectionIcon displays the corresponding half of this transparent paired artwork at the requested icon size across browser and Android navigation, creation, menus, and dashboard tiles. The PNG is bundled locally for offline use. Chores uses the matching generated clay woman with glasses, clipboard, and pen from src/Resources/chore-character.png. SectionIcon renders this transparent local image at the requested size across navigation, creation, chore options, and dashboard tiles. Expenses uses the matching calculator-and-wallet character from src/Resources/expense-character.png; Shopping List uses the shopping-bags character from src/Resources/shopping-character.png. Both are transparent local PNGs reused by SectionIcon across web and Android. Dashboard uses the matching female clay character holding an overview board from src/Resources/dashboard-character.png, bundled locally and rendered through the same shared image path at the requested icon size. Add missing icon variants to SectionIcon and reuse them across navigation, actions, and controls. Remove a habit uses a separate list-minus icon in menus and confirmation buttons; Cancel retains the custom close icon.
The Add modal's primary Save button uses a larger layered clay floppy-disk icon with a thin silhouette outline and no surrounding frame.
Entry creation stays open after a successful Save, clears only the name, retains the category, and displays an accessible confirmation naming the saved entry. Top-right X and footer Close reset and dismiss the form; saving blocks dismissal and duplicate submission. Failed saves retain the name and show an error. Shared TrackerDialog also exposes a top-right X using its existing dismissal callback and guards.
Import and Export use folded clay document cards with prominent downward and upward arrows.
Monthly and yearly dashboard cards reuse the Good, Bad, Expenses, and Chores soft-clay icons above their totals.

Organize the project into clear reusable areas, including:

- `Components/` for shared styled components, including dropdowns, text inputs, a calendar, and a date picker.
- `Resources/` for shared theme values, types, and other project resources.
- `Tabs/` for the dashboard and each tracking screen.

Prefer shared components where they fit, while allowing platform-specific presentation for Android and web.

- Use `Components/ScrollArea.tsx` for vertical scrolling in page shells, dialogs, and dropdown options, including future scrollable components. It hides native scroll indicators and supplies a transparent track, shared clay arrow buttons, and a rounded teal thumb.
- ScrollArea preserves wheel and swipe scrolling and supports arrow presses, track presses, thumb dragging, Arrow/Page/Home/End keys, and accessibility increment/decrement actions. Controls appear only when content overflows and the viewport has room, reserve a gutter, and clamp to the current range after resizing or content changes.
- The shared Button's scroll variant keeps arrow controls compact and transparent. Both platform shells, Dropdown options, and TrackerDialog bodies reuse ScrollArea; dialog footers remain outside their scrolling body.

## Good Habits tracking

- Dashboard Add and Good Habits → Options → Add a new habit create names in the saved good-habit library. The Good Habits creation dialog reuses AddEntryModal with its type fixed to Good Habit and hides the section selector. Existing and newly created names join the daily list only through Options → Add a good habit to the list.
- The Good Habits screen shows the daily list on the left and a larger shared calendar on the right in browsers at least 1000 pixels wide. Android and narrower browsers show the list first and the calendar below.
- The Good Habits title and current date sit above the rounded list card, aligned with the calendar header. Today uses European `DD/MM/YYYY` formatting; selected-date history uses day-month-year order.
- The shared Dropdown accepts labels with stable values, so identically named habits remain distinct, and its options scroll when the list is long. Its open container is raised above neighboring actions so options stay visible and selectable. Dialog membership pickers float their options in a separately dismissible overlay with an 8 px gap below the trigger, without resizing the dialog. The popup matches the field width, opens above when space below is insufficient, and keeps its custom scrollbar bounded to the viewport. Outside presses, Android Back, and selection close it; window resizing also dismisses it.
- Daily-list membership and completion dates are stored in the optional `TrackerEntry.goodHabitTracking` field using the existing local entries snapshot.
- Each daily habit uses a checkbox: checked records one completion for the device's current local date; unchecked removes only today's completion. The shared Button supports this compact, accessible checkbox mode with a shared clay checkmark and no visible action label. The checkbox sits at the far left of a horizontal habit row, with the name and status beside it. Row-level Remove buttons are omitted; removal is available through the heading's Options menu. Checkbox width is preserved on the web so it cannot collapse or overlap adjacent content. Midnight and app-resume refreshes keep the checklist aligned with the current day.
- The Options menu beside My good habits is ordered Add a new habit, Add a good habit to the list, then Remove a habit. Its custom actions have no submenu arrow. Add and Remove open the shared TrackerEntryPickerModal from AddEntryModal.tsx using the existing dialog surfaces, Dropdown, and Buttons. Cancel, an outside press, and Android Back close the dialog when it is not saving; successful saves also close it, while failures leave it open to retry. The daily-list card no longer contains inline membership controls. Removal preserves the saved name and history; re-adding restores that history, including today's completion if present.
- TrackerDialog in AddEntryModal.tsx supplies the shared bounded dialog frame, scrollable body, outside/Back dismissal, and footer actions for membership pickers and dashboard breakdowns. Footer buttons stay visible while long lists or expanded dropdowns scroll.
- The shared Button supports compact icon-only actions with accessible labels. Both Good Habits section headings reserve the same height so the date and calendar description remain aligned.
- Good Habits Options reuses ActionMenu with custom actions inside a transparent modal anchored to its button. Outside presses and Android Back dismiss the popup; its position is clamped to the window. Dashboard menu actions are preserved. The shared creation dialog retains this app's custom close icon and shared secondary Button for Cancel.
- Calendar dates show their completion count; selecting a date displays the completed habit names, including removed habits. Calendar history is read-only; checklist actions always affect today.
- Dashboard receives the saved entries from App and derives monthly and yearly Good totals from completedDates, including inactive habits. Creating a habit or adding it to the daily list does not increment totals; checking increments the current periods and unchecking decrements them. Future dates are excluded until reached. Reporting periods refresh at local midnight and app resume. Good and Bad metric tiles on both period cards open a closeable list of every saved habit in that category with separate current-month and current-year counts. Good breakdowns include inactive habits and reuse the same per-habit calculations as the aggregate totals. Bad breakdowns and totals now use their own recorded occurrence dates, including inactive bad habits, and update when the bad-habit checkbox is toggled. Expenses and Chores remain static tiles.
- The shared Calendar accepts optional daily counts without changing the compact DatePicker layout.
- All entry writes use the latest persisted snapshot, reject overlapping saves, and update the screen after a successful write. A failed initial read stops rendering the tracker to prevent overwriting unread saved data.

## Bad Habits tracking

- GoodHabitsTab.tsx exports HabitTrackerTab, shared by the Good and Bad wrappers, so both tabs have identical layout, custom controls, date formatting, Options workflows, and calendar history. Android shows the daily list before the calendar; wide browsers show them side by side.
- Bad-habit names remain in their own saved library until selected through Add a bad habit to the list. Add a new habit reuses the same creation dialog fixed to Bad Habit. Remove hides a bad habit without deleting its name or history.
- Checking a bad habit records one occurrence for the device's current local day; unchecking undoes that record. It does not mean the bad habit was avoided. The UI says Recorded today or Not recorded today, and the calendar reports recorded habits.
- Membership and dates are saved separately in TrackerEntry.badHabitTracking. Shared validation, import merges, and backups preserve both categories without mixing records. Existing name-only bad habits start outside the daily list with no history.
- Dashboard Bad totals and per-habit month/year breakdowns count recorded occurrence-days using the same current-period and future-date rules as Good totals. Creating a name or adding it to a list does not increment either category's totals.

## Chores planning and local reminders

- ChoresTab shows My chores, Chores for today, and Calendar in three columns on wide browsers (1200 px and above). My chores contains only active chore names and their calendar planning buttons, with no completion checkbox or due/status text. The second list contains confirmed chores due on the device's current local day; future plans and earlier overdue dates remain in the calendar. Android and narrower browsers stack the panels in that order. Headings sit outside the rounded cards, and dates use European formatting.
- Options contains Add a new chore (the existing creation dialog fixed to Chore), Add a chore to the list, Remove a chore, and Add a chore for a date. Shared ChorePlannerModal uses TrackerDialog, floating Dropdowns, DatePicker, TextBox, and Buttons. A per-chore calendar action and the selected-date Add button also open planning. Scheduling a saved chore adds it to the active list.
- TrackerEntry.choreTracking stores active membership, schedule definitions, and completions with separate dueDate/completedDate values. choreSchedule.ts derives dated occurrences without writing large calendars to storage. Completion checkboxes belong to today's list and confirmed occurrences on the selected calendar date. Future tasks cannot be marked done; overdue work remains accessible on its calendar date and records the actual day it was finished.
- New plans are one-off or use one Frequency dropdown: Every day, Every week, or Every month. The form saves an interval of one with the selected unit; previous saved/imported intervals remain supported by the scheduling engine. Fixed schedules remain anchored to their first date and clamp short months without drifting away from the original day. Completion-based repeats have only one confirmed pending date; the calendar additionally previews estimated future repeats, assuming on-time completion or today for overdue work. Actual completion/undo recalculates those estimates. Estimates are read-only, not persisted, not included in today's checklist, and never scheduled as reminders. A completion with later dependent completions must be undone in reverse order.
- Removal deactivates the chore and stops its existing plans/reminders while preserving the saved name and completed records. Re-adding restores history without restarting stopped plans. Duplicate plans starting on an already occupied chore/date are rejected.
- Calendar counts combine confirmed plans, completed occurrences, and read-only future estimates for each due date. Selecting a date displays its work, completion status, or Estimated label. A note explains that estimated repeats adjust after completion. Calendar exposes an optional visible-month callback for generating just that grid's counts; DatePicker supports an inline calendar in bounded dialogs.
- Dashboard Chores totals and their closeable per-chore month/year breakdown count actual completion dates, including removed chores. Creating names, list membership, and scheduling do not increment totals.
- Everything stays local: no accounts, cloud service, push subscription, or paid backend. A reminder is optional for each plan and uses a local HH:mm time chosen through shared Hour (00–23) and Minute (00–59) dropdowns rather than a text field. Saving a reminder requests notification permission only after that explicit choice; denial leaves the dialog open so the user can allow notifications or save without a reminder.
- choreReminders.ts displays browser system notifications only while the page is open and permission is granted. Local daily delivery markers prevent replay after reload or undo. Timers may be delayed in background tabs; missed earlier-day work remains available on its calendar date instead of sending a notification flood.
- choreReminders.android.ts uses expo-notifications and a local notification channel. It serializes alarm reconciliation after saved changes/import, on startup/resume, and periodically while running. It cancels obsolete alarms and prepares up to the next 128 reminders within a rolling two-year window, also including first dates beyond that window. Opening the app replenishes this queue. Android may delay delivery according to system settings; notification permission is required. The native app must be rebuilt after installing the notification plugin.
- App.tsx applies chore updates through the existing persist-before-display guard, then refreshes device reminders. Reminder failures surface separately and do not roll back saved plans. package.json/package-lock.json include the SDK-compatible expo-notifications dependency; app.json registers its config plugin.

## Current implementation status

The Add action opens a shared modal for named good habits, bad habits, expense types, and chores. AsyncStorage saves all names, habit tracking, and chore plans/completions locally. Good, Bad, and Chores have active lists, dated history, and connected dashboard counts/breakdowns. Chores supports one-off and recurring planning with local reminders. Version 4 JSON backups include all three tracking categories. Expense transactions and their dashboard calculations are not connected yet.

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
- Dashboard metrics and statistical calculations for Expenses.
- Whether future tracker types need import rules beyond the current ID merge and good-habit history preservation.
