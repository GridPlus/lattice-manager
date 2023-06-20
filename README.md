# Lattice Manager 

Lattice Manager is a web application that allows users to manage their Lattice1 device.

## Technologies

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)

## Getting Started

### Prerequisites

- Node.js v14+ 

### Installing

1. Clone the repository
2. Install Dependencies

    ```bash
    npm install
    ```

3. Run the application

    ```bash
    npm start
    ```

4. Open the application in your browser

    ```bash
    http://localhost:3000
    ```

### Running the tests

1. Run the tests

    ```bash
    npm test
    ```

## Using with Lattice Connect

1. Follow steps in [installing](#installing) section.
2. Copy and rename `.env.sample` to `.env`
3. Set `VITE_BASE_SIGNING_URL` to the URL of your Lattice Connect instance.
4. Start the Lattice Manager application

    ```bash
    npm start
    ```

5. Connect to your Lattice1 device.
6. Set the Connection Endpoint in Lattice Manager to your Lattice Connect URL. 
