# StakeBasket Developer Guide

Welcome to the StakeBasket developer guide! This document provides everything you need to get started with developing and contributing to the StakeBasket project.

## 1. Project Overview

StakeBasket is a decentralized ETF platform for staking multiple Core DAO assets with automated rebalancing and governance features. Our goal is to provide a simple and secure way for users to earn yield on their crypto assets.

### Core Features

*   **Multi-Asset Staking:** Stake CORE, coreBTC, and other Core DAO assets.
*   **Automated Rebalancing:** Smart contracts automatically optimize your portfolio.
*   **Governance System:** Vote on protocol decisions and earn rewards.
*   **Liquid Staking:** Get stCORE tokens representing your staked CORE.
*   **Real-time Analytics:** Track performance and yields.

## 2. Getting Started

### Prerequisites

*   Node.js 18+
*   npm or bun
*   MetaMask or a compatible wallet

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/staking.git
    cd staking
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    ```bash
    cp .env.example .env
    ```

    Update the `.env` file with your private key.

### Running the Project Locally

1.  **Start the local Hardhat network:**

    ```bash
    npx hardhat node
    ```

2.  **Deploy the contracts to the local network:**

    ```bash
    npx hardhat run scripts/deploy.cjs --network localhost
    ```

3.  **Start the frontend development server:**

    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:5173`.

## 3. Development Workflow

### Running Tests

To run the test suite, use the following command:

```bash
npx hardhat test
```

### Project Structure

For a detailed overview of the project structure, please refer to the [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) document.

### Smart Contracts

The smart contracts are located in the `contracts` directory. For a detailed description of each contract, please refer to the [CONTRACT_DESCRIPTIONS.md](docs/CONTRACT_DESCRIPTIONS.md) document.

### Frontend

The frontend code is located in the `src` directory. It is a React application built with Vite.

## 4. Contributing

We welcome contributions from the community! To contribute to the project, please follow these steps:

1.  **Fork the repository.**
2.  **Create a new feature branch.**
3.  **Make your changes.**
4.  **Test your changes thoroughly.**
5.  **Submit a pull request.**

## 5. Documentation

*   [Project Structure](docs/PROJECT_STRUCTURE.md)
*   [Contract Descriptions](docs/CONTRACT_DESCRIPTIONS.md)
*   [Deployment Guide](docs/DEPLOYMENT.md)
*   [Testing Guide](docs/TESTING_GUIDE.md)

## 6. License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
