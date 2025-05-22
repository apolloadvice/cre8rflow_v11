# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/0d30b6cc-44a5-4e63-92e9-05c316abef90

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/0d30b6cc-44a5-4e63-92e9-05c316abef90) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Keyboard Shortcuts

The video editor supports the following keyboard shortcuts:

- **Undo**: Ctrl/Cmd + Z
- **Redo**: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
- **Delete selected clip**: Backspace or Delete

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/0d30b6cc-44a5-4e63-92e9-05c316abef90) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## 📝 How to Use Natural Language Video Editing Commands

You can control the video editor using natural language commands in the chat panel. Here's how to structure your input for best results:

### Supported Command Types & Examples

#### 1. **Cut**
- **Format:** `cut [first|last|clip N] clip at [time]`
- **Examples:**
  - `cut first clip at 00:05`
  - `cut last clip at 00:10`
  - `cut clip 2 at 00:15`

#### 2. **Trim**
- **Format:** `trim [first|last|clip N] clip [to|from] [time]`
- **Examples:**
  - `trim first clip to 00:10` (keeps only up to 10s)
  - `trim last clip from 00:05` (removes everything before 5s)
  - `trim clip 2 to 00:20`

#### 3. **Add Text Overlay**
- **Format:** `add text "[your text]" [at|from] [start time] [to [end time]]`
- **Examples:**
  - `add text "Hello World" at 00:05` (shows for 3s by default)
  - `add text "Intro" from 00:02 to 00:07`

#### 4. **Add Image Overlay**
- **Format:** `overlay [image.png] [at|from] [start time] [to [end time]]`
- **Examples:**
  - `overlay logo.png at 00:10` (shows for 3s by default)
  - `overlay image.png from 00:04 to 00:06`

### ⏱ Time Format
- Use `mm:ss` (e.g., `01:23` for 1 minute 23 seconds) or `ss` (e.g., `15` for 15 seconds).
- You can also use `hh:mm:ss` for longer videos.

### 💡 Tips for Best Results
- Be specific about which clip you want to edit (e.g., `first`, `last`, or `clip 2`).
- For overlays, make sure the asset name matches an uploaded or available image.
- If you make a mistake, use the Undo button or `undo` command.
- The timeline and preview will update instantly for supported commands.

### ⚠️ Limitations
- Only the above command formats are currently supported.
- More advanced commands (e.g., transitions, effects) may be added in the future.

For more help, see the chat panel's quick actions or ask for examples!

