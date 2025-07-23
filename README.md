
# Pet Memorial Sanctuary

A peaceful, emotional sanctuary to create and cherish digital memorials for pets who have passed away. This application provides a warm and easy-to-use interface to build a lasting tribute without needing an account. It is built as a single-page application using React and Tailwind CSS, with data persisted locally in the browser's localStorage.

## Features

- **No Account Needed:** Create memorials instantly without registration.
- **Emotional & Gentle UI:** A calming design with pastel colors and soft typography.
- **Create & Customize:** Add your pet's name, a heartfelt message, a long-form tribute, and up to 3 photos.
- **Automatic & Custom Codes:** Let the app generate a unique code for your memorial, or create your own for easy recall.
- **Image Compression:** Uploaded images are automatically resized and compressed to respect browser storage limits and improve performance.
- **Local Persistence:** Memorials are saved directly in your browser, making them fast and private.
- **Easy Recovery:** Access any memorial directly using its unique code.
- **Fully Responsive:** Works beautifully on desktops, tablets, and mobile devices.

## Tech Stack

- **Frontend:** React, React Router
- **Styling:** Tailwind CSS
- **Build Tool:** Vite
- **Deployment:** Node.js, PM2, Serve

---

## Getting Started (Local Development)

To run this project on your local machine, follow these steps.

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd pet-memorial-sanctuary
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server, typically at `http://localhost:5173`. The application will automatically reload when you make changes to the source files.

## Available Scripts

In the project directory, you can run:

-   `npm run dev`: Runs the app in development mode.
-   `npm run build`: Builds the app for production to the `dist` folder. It correctly bundles React in production mode and optimizes the build for the best performance.
-   `npm run preview`: Serves the production build locally to preview it before deployment.

---

For deployment instructions, please see the `DEPLOYMENT.md` file.
