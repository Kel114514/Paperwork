# Project Name

## Installation

### Backend Requirements

1. **Install Python 3.12**  
    Download and install Python 3.12 from the [official Python website](https://www.python.org/downloads/). Ensure it is added to your system PATH during installation.

1. **Install PyTorch**  
    Install PyTorch based on your platform and CUDA version by following the [official PyTorch installation guide](https://pytorch.org/get-started/locally/).

    Example command for CUDA 12.1 (check the guide for your specific setup):

    ```bash
    pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
    ```

1. **Install Project Dependencies**
    Navigate to the project root directory and run:

    ```bash
    pip install -r requirements.txt
    ```

### Frontend Requirements

1. **Install Node.js 20.18.2**
    Download and install Node.js 20.18.2 from the official Node.js website or use a version manager like nvm (recommended).

    For nvm, run:

    ```bash
    nvm install 20.18.2
    nvm use 20.18.2
    ```

2. **Install Frontend Dependencies**
    Navigate to the frontend directory (if applicable) and run:

    ```bash
    npm install
    ```

## Usage

1. **Start the Backend Server**  
   From the project root directory, run:

   ```bash
   python main.py
   ```

    This will start the backend server (default port may vary depending on configuration).

2. **Start the Frontend Development Server**
    Open a new terminal, navigate to the github_frontend directory, and run:

    ```bash
    cd github-frontend
    npm run dev
    ```

    The terminal will display a local URL (typically <http://localhost:5173/>) where the frontend is running.

3. **Access the Application**
    Open the displayed URL (e.g., <http://localhost:5173/>) in your browser. You can now start using the search functionality.
