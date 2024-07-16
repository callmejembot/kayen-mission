const { ethers } = require('ethers');
const chalk = require('chalk');
const axios = require('axios');
const fs = require('fs');
const readline = require('readline');

// RPC URL
const provider = new ethers.providers.JsonRpcProvider('https://spicy-rpc.chiliz.com/');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const headers = {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.5',
    'Content-Type': 'application/json',
    'Origin': 'https://app.kayen.org',
    'Priority': 'u=1, i',
    'Referer': 'https://app.kayen.org/league',
    'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Brave";v="126"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Gpc': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/126.0.0.0 Safari/537.36'
};

const getUserDetail = async (walletAddress) => {
    try {
        const response = await axios.get(`https://app.kayen.org/api/leaderboard/user?walletAddress=${walletAddress}`, { headers });
        const point = response.data.point;
        return point;
    } catch (error) {
        console.error('Error:', error);
        return 0; // Return default value if unable to fetch points
    }
};

const swapContractAddress = '0x4D3D4e9b3975F592B9ec740902628531177B3079';
const tokenContractAddress = '0xb0Fa395a3386800658B9617F90e834E2CeC76Dd3';
const wrapContractAddress = '0xe81671f425fd1d84127255270642CCD36E86EE7C';
const wrapPSGToken = '0x6D124526a5948Cb82BB5B531Bf9989D8aB34C899';
const routerAddressLiquid = '0xb82b0e988a1FcA39602c5079382D360C870b44c8';

const tokenContractABI = [
    // balanceOf function
    {
        constant: true,
        inputs: [{ name: '_owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function'
    },
    // approve function
    {
        constant: false,
        inputs: [
            { name: '_spender', type: 'address' },
            { name: '_value', type: 'uint256' }
        ],
        name: 'approve',
        outputs: [{ name: 'success', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
    }
];

const approveLiquid = [
    // approve function
    {
        constant: false,
        inputs: [
            { name: '_spender', type: 'address' },
            { name: '_value', type: 'uint256' }
        ],
        name: 'approve',
        outputs: [{ name: 'success', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
    }
];

const routerLiquidABI = [
    {
        inputs: [
            { internalType: 'address', name: 'token', type: 'address' },
            { internalType: 'uint256', name: 'amountTokenDesired', type: 'uint256' },
            { internalType: 'uint256', name: 'amountTokenMin', type: 'uint256' },
            { internalType: 'uint256', name: 'amountETHMin', type: 'uint256' },
            { internalType: 'address', name: 'to', type: 'address' },
            { internalType: 'uint256', name: 'deadline', type: 'uint256' }
        ],
        name: 'addLiquidityETH',
        outputs: [
            { internalType: 'uint256', name: 'amountToken', type: 'uint256' },
            { internalType: 'uint256', name: 'amountETH', type: 'uint256' },
            { internalType: 'uint256', name: 'liquidity', type: 'uint256' }
        ],
        stateMutability: 'payable',
        type: 'function'
    }
];

const swapContractABI = [
    {
        "inputs": [
            { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
            { "internalType": "address[]", "name": "path", "type": "address[]" },
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "deadline", "type": "uint256" }
        ],
        "name": "swapExactETHForTokens",
        "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
        "stateMutability": "payable",
        "type": "function"
    }
];

const wrapContractABI = [
    // wrap function
    {
        constant: false,
        inputs: [
            { name: 'account', type: 'address' },
            { name: 'underlyingToken', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        name: 'wrap',
        outputs: [],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
    }
];

const getBalance = async (tokenContract, walletAddress) => {
    const balance = await tokenContract.balanceOf(walletAddress);
    const formattedBalance = ethers.utils.formatUnits(balance, 0); // Token dengan desimal 0
    return formattedBalance;
};

const approveWrapForLiquid = async (tokenPSGContract) => {
    const amountTokenDesired = ethers.utils.parseUnits('1', 18);
    try {
        const approvalTx = await tokenPSGContract.approve(routerAddressLiquid, amountTokenDesired);
        await approvalTx.wait();
        console.log(chalk.greenBright('Approval successful.'));
        return true;
    } catch (error) {
        console.error('Error in approveToken:', error);
        return false;
    }
};

const addLiquidity = async (liquidRouterContract, walletAddress) => {
    const amountTokenDesired = ethers.utils.parseUnits('1', 18);
    const amountTokenMin = ethers.utils.parseUnits('0', 18);
    const amountETHMin = ethers.utils.parseUnits('0', 'ether');
    const deadline = 104984331718;
    const toAddress = walletAddress;
    try {
        const payableAmount = ethers.utils.parseEther('0.1'); // Adjust the ETH amount as needed

        const addLiquidityTx = await liquidRouterContract.addLiquidityETH(
            wrapPSGToken,
            amountTokenDesired,
            amountTokenMin,
            amountETHMin,
            toAddress,
            deadline,
            { value: payableAmount, gasLimit: 325000 }
        );

        const receipt = await addLiquidityTx.wait();
        console.log(chalk.greenBright(`Add Liquid successful | Hash: ${receipt.transactionHash}`));
        const hash = receipt.transactionHash;
        console.log(chalk.yellowBright(`Submitting transaction hashes for points claim...`));
        await claimPointSwap(hash, walletAddress);
    } catch (error) {
        console.error('Error in addLiquidityETH:', error);
        return null;
    }
};

const approveToken = async (tokenContract, wrapContract) => {
    try {
        const spenderAddress = wrapContract.address; // Address yang akan menerima approval
        const approvalAmount = ethers.utils.parseUnits('1', 0); // Amount yang disetujui, misal 100 tokens

        const approvalTx = await tokenContract.approve(spenderAddress, approvalAmount);
        await approvalTx.wait();
        console.log('Approval successful.');
        return true;
    } catch (error) {
        console.error('Error in approveToken:', error);
        return false;
    }
};

const swapExactETHForTokens = async (swapContract, walletAddress) => {
    const amountOutMin = 0; // Minimal jumlah token yang diharapkan
    const path = [
        '0x678c34581db0a7808d0aC669d7025f1408C9a3C6', // Replace with the correct token address
        '0x6D124526a5948Cb82BB5B531Bf9989D8aB34C899' // Replace with the correct token address
    ];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // Deadline set to 20 minutes from now
    const amountIn = ethers.utils.parseEther('0.1'); // Amount of ETH to swap

    try {

        const swapTx = await swapContract.swapExactETHForTokens(
            amountOutMin,
            path,
            walletAddress,
            deadline,
            { value: amountIn, gasLimit: 324000 }
        );

        const receipt = await swapTx.wait();
        console.log(chalk.greenBright(`Swap successful | Hash: ${receipt.transactionHash}`));
        const hash = receipt.transactionHash;
        console.log(chalk.yellowBright(`Submitting transaction hashes for points claim...`));
        await claimPointSwap(hash, walletAddress);
    } catch (error) {
        console.error('Error in swapExactETHForTokens:', error);
    }
};

const wrapToken = async (wrapContract, walletAddress) => {
    try {
        const underlyingToken = '0xb0Fa395a3386800658B9617F90e834E2CeC76Dd3';
        const amount = ethers.utils.parseUnits('1', 0); // Amount yang akan di-wrap, misalnya 1 token

        const wrapTx = await wrapContract.wrap(walletAddress, underlyingToken, amount);

        const receipt = await wrapTx.wait();
        console.log(chalk.greenBright(`wrap successful | Hash: ${receipt.transactionHash}`));
        const hash = receipt.transactionHash;
        console.log(chalk.yellowBright(`Submitting transaction hashes for points claim...`));
        await claimPointSwap(hash, walletAddress);
    } catch (error) {
        console.error('Error in wrapToken:', error);
        return false;
    }
};

// Function to read private keys from privateKey.txt
const readPrivateKeys = async (filePath) => {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const privateKeys = [];
    for await (const line of rl) {
        privateKeys.push(line.trim());
    }
    return privateKeys;
};

// Main function to execute the missions for each private key
const claimPointSwap = async (hash, walletAddress) => {
    const payload = {
        chainId: 88882,
        walletAddress: walletAddress,
        txHash: hash,
        points: 100
    };

    try {
        const response = await axios.post('https://app.kayen.org/api/leaderboard/transaction', payload, { headers });
        console.log(chalk.blueBright('Response:', response.data.message));
    } catch (error) {
        if (error.response && error.response.data) {
            console.error(chalk.redBright(error.response.data.error));
        } else {
            console.error('Error:', error);
        }
    }
};



const misiSignWallet = async (walletAddress, wallet) => {
    try {
        const message = "Welcome To Kayen app";

        
        const signature = wallet.signMessage(message);
        console.log('Signature: ', signature);
        const payload = {
            walletAddress: walletAddress,
            missionId: 1,
            id: 1
        };
        const response = await axios.post('https://app.kayen.org/api/leaderboard/mission/wallet/connect-wallet', payload, { headers });
        console.log(chalk.blueBright('Response:', response.data.message));
    } catch (error) {
        if (error.response && error.response.data) {
            console.error(chalk.redBright(error.response.data.error));
        } else {
            console.log(error);
        }
    }
};



const main = async () => {
    const privateKeys = await readPrivateKeys('privateKey.txt');

    for (const privateKey of privateKeys) {
        const wallet = new ethers.Wallet(privateKey, provider);
        const walletAddress = wallet.address;

        console.log(chalk.yellowBright(`Address Wallet: ${walletAddress}`));

        const tokenContract = new ethers.Contract(tokenContractAddress, tokenContractABI, wallet);
        const swapContract = new ethers.Contract(swapContractAddress, swapContractABI, wallet);
        const wrapContract = new ethers.Contract(wrapContractAddress, wrapContractABI, wallet);
        const tokenPSGContract = new ethers.Contract(wrapPSGToken, approveLiquid, wallet);
        const liquidRouterContract = new ethers.Contract(routerAddressLiquid, routerLiquidABI, wallet);
        
        console.log(chalk.blueBright('Menyelesaikan Misi SIGN wallet.....'));
        await misiSignWallet(walletAddress, wallet);

        for (let i = 0; i < 5; i++) {
            try {
                console.log(chalk.blueBright('Swapping ETH for Tokens...'));
                await swapExactETHForTokens(swapContract, walletAddress);
                //console.log(chalk.yellowBright(`Submitting transaction hashes for points claim...`));
                //await claimPointSwap(swapHash, walletAddress);

                await delay(3000);
                console.log(chalk.blueBright('Approving Token for Wrap Contract...'));
                await approveToken(tokenContract, wrapContract);

                console.log(chalk.blueBright('Wrapping Tokens...'));
                const wrapHash = await wrapToken(wrapContract, walletAddress);
                //console.log(chalk.greenBright(`Wrap successful | Transaction Hash: ${wrapHash}`));
                await delay(3000);

                console.log(chalk.blueBright('Approving Wrap for Liquid...'));
                await approveWrapForLiquid(tokenPSGContract);

                console.log(chalk.blueBright('Adding Liquidity...'));
                const liquidHash = await addLiquidity(liquidRouterContract, walletAddress);
                /* console.log(chalk.greenBright(`Add Liquidity successful | Transaction Hash: ${liquidHash}`));
                console.log(chalk.yellowBright(`Submitting transaction hashes for points claim...`));
                await claimPointSwap(liquidHash, walletAddress); */

                const points = await getUserDetail(walletAddress);
                console.log(chalk.yellowBright(`User Points: ${points}`));
                await delay(4000); // Add a delay between each iteration
                console.log(chalk.red('Delay....'));

                




            } catch (error) {
                console.error(chalk.red('Error:', error));
            }
        }
    }
};




main().catch((error) => {
    console.error('Error in main function:', error);
});
