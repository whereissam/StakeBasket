const { ethers } = require('hardhat');
const { expect } = require('chai');
const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

describe('Core Liquid Staking', function () {
    async function deployLiquidStakingFixture() {
        const [owner, treasury, operator, user1, user2, validator1, validator2, validator3] = await ethers.getSigners();

        // Deploy MockCoreStaking contract (for testing)
        const MockCoreStaking = await ethers.getContractFactory('MockCoreStaking');
        const mockCoreStaking = await MockCoreStaking.deploy();

        // Deploy CoreLiquidStakingManager
        const CoreLiquidStakingManager = await ethers.getContractFactory('CoreLiquidStakingManager');
        const liquidStakingManager = await CoreLiquidStakingManager.deploy(
            mockCoreStaking.address,
            treasury.address,
            operator.address
        );

        // Get stCORE token address
        const stCoreTokenAddress = await liquidStakingManager.stCoreToken();
        const StCoreToken = await ethers.getContractFactory('StCoreToken');
        const stCoreToken = StCoreToken.attach(stCoreTokenAddress);

        // Add mock validators to both contracts
        await mockCoreStaking.addValidator(validator1.address, 500, 8000, true); // 5% commission, 80% hybrid score
        await mockCoreStaking.addValidator(validator2.address, 300, 9000, true); // 3% commission, 90% hybrid score
        await mockCoreStaking.addValidator(validator3.address, 700, 7500, true); // 7% commission, 75% hybrid score

        // Add validators to liquid staking manager
        await liquidStakingManager.addValidator(validator1.address);
        await liquidStakingManager.addValidator(validator2.address);
        await liquidStakingManager.addValidator(validator3.address);

        return {
            mockCoreStaking,
            liquidStakingManager,
            stCoreToken,
            owner,
            treasury,
            operator,
            user1,
            user2,
            validator1,
            validator2,
            validator3
        };
    }

    describe('Deployment', function () {
        it('Should deploy contracts correctly', async function () {
            const { liquidStakingManager, stCoreToken, treasury, operator } = await loadFixture(deployLiquidStakingFixture);
            
            expect(await liquidStakingManager.treasury()).to.equal(treasury.address);
            expect(await liquidStakingManager.operator()).to.equal(operator.address);
            expect(await stCoreToken.liquidStakingManager()).to.equal(liquidStakingManager.address);
            expect(await stCoreToken.name()).to.equal('Staked CORE');
            expect(await stCoreToken.symbol()).to.equal('stCORE');
        });

        it('Should have correct initial parameters', async function () {
            const { liquidStakingManager } = await loadFixture(deployLiquidStakingFixture);
            
            expect(await liquidStakingManager.rebalanceThreshold()).to.equal(500); // 5%
            expect(await liquidStakingManager.maxValidatorRisk()).to.equal(600);
            expect(await liquidStakingManager.protocolFee()).to.equal(50); // 0.5%
            expect(await liquidStakingManager.performanceFee()).to.equal(1000); // 10%
        });
    });

    describe('Staking', function () {
        it('Should allow users to stake CORE and receive stCORE', async function () {
            const { liquidStakingManager, stCoreToken, user1 } = await loadFixture(deployLiquidStakingFixture);
            
            const stakeAmount = ethers.utils.parseEther('10');
            
            await expect(
                liquidStakingManager.connect(user1).stake(ethers.constants.AddressZero, { value: stakeAmount })
            ).to.emit(liquidStakingManager, 'Staked');
            
            const stCoreBalance = await stCoreToken.balanceOf(user1.address);
            expect(stCoreBalance).to.equal(stakeAmount); // 1:1 ratio initially
            
            const totalStaked = await stCoreToken.totalStakedCore();
            expect(totalStaked).to.equal(stakeAmount);
        });

        it('Should maintain 1:1 conversion ratio initially', async function () {
            const { liquidStakingManager, stCoreToken, user1 } = await loadFixture(deployLiquidStakingFixture);
            
            const stakeAmount = ethers.utils.parseEther('5');
            
            await liquidStakingManager.connect(user1).stake(ethers.constants.AddressZero, { value: stakeAmount });
            
            const conversionRate = await stCoreToken.getConversionRate();
            expect(conversionRate).to.equal(ethers.utils.parseEther('1')); // 1:1 ratio
            
            const coreToStCore = await stCoreToken.coreToStCore(stakeAmount);
            expect(coreToStCore).to.equal(stakeAmount);
            
            const stCoreToCore = await stCoreToken.stCoreToCore(stakeAmount);
            expect(stCoreToCore).to.equal(stakeAmount);
        });

        it('Should select optimal validator automatically', async function () {
            const { liquidStakingManager, mockCoreStaking, user1, validator2 } = await loadFixture(deployLiquidStakingFixture);
            
            const stakeAmount = ethers.utils.parseEther('10');
            
            await liquidStakingManager.connect(user1).stake(ethers.constants.AddressZero, { value: stakeAmount });
            
            // validator2 should be selected as it has the best performance (highest APY, lowest commission)
            const delegatedAmount = await liquidStakingManager.delegatedAmountByValidator(validator2.address);
            expect(delegatedAmount).to.equal(stakeAmount);
        });

        it('Should reject zero stake amount', async function () {
            const { liquidStakingManager, user1 } = await loadFixture(deployLiquidStakingFixture);
            
            await expect(
                liquidStakingManager.connect(user1).stake(ethers.constants.AddressZero, { value: 0 })
            ).to.be.revertedWith('CoreLiquidStaking: stake amount must be positive');
        });
    });

    describe('Unstaking', function () {
        it('Should allow users to request unstaking', async function () {
            const { liquidStakingManager, stCoreToken, user1 } = await loadFixture(deployLiquidStakingFixture);
            
            const stakeAmount = ethers.utils.parseEther('10');
            await liquidStakingManager.connect(user1).stake(ethers.constants.AddressZero, { value: stakeAmount });
            
            const unstakeAmount = ethers.utils.parseEther('5');
            
            // Approve stCORE transfer
            await stCoreToken.connect(user1).approve(liquidStakingManager.address, unstakeAmount);
            
            await expect(
                liquidStakingManager.connect(user1).requestUnstake(unstakeAmount)
            ).to.emit(liquidStakingManager, 'UnstakeRequested');
            
            const request = await liquidStakingManager.unstakeRequests(0);
            expect(request.user).to.equal(user1.address);
            expect(request.stCoreAmount).to.equal(unstakeAmount);
            expect(request.coreAmount).to.equal(unstakeAmount); // 1:1 initially
            expect(request.fulfilled).to.be.false;
        });

        it('Should fulfill unstake request after unstaking period', async function () {
            const { liquidStakingManager, stCoreToken, user1 } = await loadFixture(deployLiquidStakingFixture);
            
            const stakeAmount = ethers.utils.parseEther('10');
            await liquidStakingManager.connect(user1).stake(ethers.constants.AddressZero, { value: stakeAmount });
            
            const unstakeAmount = ethers.utils.parseEther('5');
            
            // Request unstaking
            await stCoreToken.connect(user1).approve(liquidStakingManager.address, unstakeAmount);
            await liquidStakingManager.connect(user1).requestUnstake(unstakeAmount);
            
            // Fast forward time
            await time.increase(7 * 24 * 60 * 60 + 1); // 7 days + 1 second
            
            const balanceBefore = await user1.getBalance();
            
            await expect(
                liquidStakingManager.connect(user1).fulfillUnstake(0)
            ).to.emit(liquidStakingManager, 'Unstaked');
            
            const balanceAfter = await user1.getBalance();
            expect(balanceAfter.sub(balanceBefore)).to.be.closeTo(unstakeAmount, ethers.utils.parseEther('0.001')); // Account for gas
            
            const request = await liquidStakingManager.unstakeRequests(0);
            expect(request.fulfilled).to.be.true;
        });

        it('Should reject fulfilling unstake request too early', async function () {
            const { liquidStakingManager, stCoreToken, user1 } = await loadFixture(deployLiquidStakingFixture);
            
            const stakeAmount = ethers.utils.parseEther('10');
            await liquidStakingManager.connect(user1).stake(ethers.constants.AddressZero, { value: stakeAmount });
            
            const unstakeAmount = ethers.utils.parseEther('5');
            
            await stCoreToken.connect(user1).approve(liquidStakingManager.address, unstakeAmount);
            await liquidStakingManager.connect(user1).requestUnstake(unstakeAmount);
            
            await expect(
                liquidStakingManager.connect(user1).fulfillUnstake(0)
            ).to.be.revertedWith('CoreLiquidStaking: unstaking period not elapsed');
        });
    });

    describe('Rebalancing', function () {
        it('Should perform automated rebalancing', async function () {
            const { liquidStakingManager, mockCoreStaking, operator, user1, validator1, validator2 } = await loadFixture(deployLiquidStakingFixture);
            
            // Stake large amount to create imbalance
            const stakeAmount = ethers.utils.parseEther('100');
            await liquidStakingManager.connect(user1).stake(validator1.address, { value: stakeAmount });
            
            const delegatedBefore = await liquidStakingManager.delegatedAmountByValidator(validator1.address);
            expect(delegatedBefore).to.equal(stakeAmount);
            
            // Perform rebalancing
            await expect(
                liquidStakingManager.connect(operator).rebalance()
            ).to.emit(liquidStakingManager, 'Rebalanced');
            
            // Check that stake was redistributed
            const delegatedAfter1 = await liquidStakingManager.delegatedAmountByValidator(validator1.address);
            const delegatedAfter2 = await liquidStakingManager.delegatedAmountByValidator(validator2.address);
            
            expect(delegatedAfter1).to.be.lt(stakeAmount);
            expect(delegatedAfter2).to.be.gt(0);
        });

        it('Should perform manual rebalancing', async function () {
            const { liquidStakingManager, operator, user1, validator1, validator2 } = await loadFixture(deployLiquidStakingFixture);
            
            const stakeAmount = ethers.utils.parseEther('50');
            await liquidStakingManager.connect(user1).stake(validator1.address, { value: stakeAmount });
            
            const rebalanceAmount = ethers.utils.parseEther('20');
            
            await expect(
                liquidStakingManager.connect(operator).manualRebalance(validator1.address, validator2.address, rebalanceAmount)
            ).to.emit(liquidStakingManager, 'Rebalanced');
            
            const delegated1 = await liquidStakingManager.delegatedAmountByValidator(validator1.address);
            const delegated2 = await liquidStakingManager.delegatedAmountByValidator(validator2.address);
            
            expect(delegated1).to.equal(stakeAmount.sub(rebalanceAmount));
            expect(delegated2).to.equal(rebalanceAmount);
        });

        it('Should only allow operator to rebalance', async function () {
            const { liquidStakingManager, user1, validator1, validator2 } = await loadFixture(deployLiquidStakingFixture);
            
            await expect(
                liquidStakingManager.connect(user1).rebalance()
            ).to.be.revertedWith('CoreLiquidStaking: not operator');
            
            await expect(
                liquidStakingManager.connect(user1).manualRebalance(validator1.address, validator2.address, 1000)
            ).to.be.revertedWith('CoreLiquidStaking: not operator');
        });
    });

    describe('Reward Collection', function () {
        it('Should collect and compound rewards', async function () {
            const { liquidStakingManager, mockCoreStaking, stCoreToken, operator, user1, validator1 } = await loadFixture(deployLiquidStakingFixture);
            
            const stakeAmount = ethers.utils.parseEther('50');
            await liquidStakingManager.connect(user1).stake(validator1.address, { value: stakeAmount });
            
            // Simulate rewards in mock contract
            const rewardAmount = ethers.utils.parseEther('5');
            await mockCoreStaking.setValidatorReward(validator1.address, rewardAmount);
            
            const totalStakedBefore = await stCoreToken.totalStakedCore();
            
            await expect(
                liquidStakingManager.connect(operator).afterTurnRound()
            ).to.emit(liquidStakingManager, 'RewardsCollected');
            
            const totalStakedAfter = await stCoreToken.totalStakedCore();
            expect(totalStakedAfter).to.be.gt(totalStakedBefore);
            
            // Conversion rate should improve (more CORE per stCORE)
            const conversionRate = await stCoreToken.getConversionRate();
            expect(conversionRate).to.be.gt(ethers.utils.parseEther('1'));
        });

        it('Should handle inactive validators during afterTurnRound', async function () {
            const { liquidStakingManager, mockCoreStaking, operator, user1, validator1, validator2 } = await loadFixture(deployLiquidStakingFixture);
            
            const stakeAmount = ethers.utils.parseEther('30');
            await liquidStakingManager.connect(user1).stake(validator1.address, { value: stakeAmount });
            
            // Make validator1 inactive
            await mockCoreStaking.setValidatorStatus(validator1.address, false);
            
            await liquidStakingManager.connect(operator).afterTurnRound();
            
            // Stake should be moved away from inactive validator
            const delegated1 = await liquidStakingManager.delegatedAmountByValidator(validator1.address);
            const delegated2 = await liquidStakingManager.delegatedAmountByValidator(validator2.address);
            
            expect(delegated1).to.equal(0);
            expect(delegated2).to.equal(stakeAmount);
        });
    });

    describe('Validator Management', function () {
        it('Should add and remove validators', async function () {
            const { liquidStakingManager, owner } = await loadFixture(deployLiquidStakingFixture);
            
            const [, , , , , , , , newValidator] = await ethers.getSigners();
            
            await expect(
                liquidStakingManager.connect(owner).addValidator(newValidator.address)
            ).to.emit(liquidStakingManager, 'ValidatorAdded');
            
            expect(await liquidStakingManager.isActiveValidator(newValidator.address)).to.be.true;
            
            await expect(
                liquidStakingManager.connect(owner).removeValidator(newValidator.address)
            ).to.emit(liquidStakingManager, 'ValidatorRemoved');
            
            expect(await liquidStakingManager.isActiveValidator(newValidator.address)).to.be.false;
        });

        it('Should prevent removing validator with delegations', async function () {
            const { liquidStakingManager, owner, user1, validator1 } = await loadFixture(deployLiquidStakingFixture);
            
            const stakeAmount = ethers.utils.parseEther('10');
            await liquidStakingManager.connect(user1).stake(validator1.address, { value: stakeAmount });
            
            await expect(
                liquidStakingManager.connect(owner).removeValidator(validator1.address)
            ).to.be.revertedWith('CoreLiquidStaking: validator has delegations');
        });
    });

    describe('Parameter Updates', function () {
        it('Should allow owner to update parameters', async function () {
            const { liquidStakingManager, owner } = await loadFixture(deployLiquidStakingFixture);
            
            await expect(
                liquidStakingManager.connect(owner).setRebalanceThreshold(1000)
            ).to.emit(liquidStakingManager, 'ParameterUpdated');
            
            expect(await liquidStakingManager.rebalanceThreshold()).to.equal(1000);
            
            await expect(
                liquidStakingManager.connect(owner).setMaxValidatorRisk(800)
            ).to.emit(liquidStakingManager, 'ParameterUpdated');
            
            expect(await liquidStakingManager.maxValidatorRisk()).to.equal(800);
        });

        it('Should reject excessive fees', async function () {
            const { liquidStakingManager, owner } = await loadFixture(deployLiquidStakingFixture);
            
            await expect(
                liquidStakingManager.connect(owner).setProtocolFee(1500) // 15%
            ).to.be.revertedWith('CoreLiquidStaking: fee too high');
            
            await expect(
                liquidStakingManager.connect(owner).setPerformanceFee(2500) // 25%
            ).to.be.revertedWith('CoreLiquidStaking: fee too high');
        });
    });

    describe('Emergency Functions', function () {
        it('Should allow owner to pause and unpause', async function () {
            const { liquidStakingManager, owner, user1 } = await loadFixture(deployLiquidStakingFixture);
            
            await liquidStakingManager.connect(owner).pause();
            
            await expect(
                liquidStakingManager.connect(user1).stake(ethers.constants.AddressZero, { value: ethers.utils.parseEther('1') })
            ).to.be.revertedWith('Pausable: paused');
            
            await liquidStakingManager.connect(owner).unpause();
            
            await expect(
                liquidStakingManager.connect(user1).stake(ethers.constants.AddressZero, { value: ethers.utils.parseEther('1') })
            ).to.not.be.reverted;
        });
    });

    describe('Integration Tests', function () {
        it('Should handle multiple users and complex scenarios', async function () {
            const { liquidStakingManager, stCoreToken, mockCoreStaking, operator, user1, user2, validator1, validator2 } = await loadFixture(deployLiquidStakingFixture);
            
            // User1 stakes 50 CORE
            await liquidStakingManager.connect(user1).stake(validator1.address, { value: ethers.utils.parseEther('50') });
            
            // User2 stakes 30 CORE
            await liquidStakingManager.connect(user2).stake(validator2.address, { value: ethers.utils.parseEther('30') });
            
            // Simulate rewards
            await mockCoreStaking.setValidatorReward(validator1.address, ethers.utils.parseEther('2'));
            await mockCoreStaking.setValidatorReward(validator2.address, ethers.utils.parseEther('1.5'));
            
            // Collect rewards
            await liquidStakingManager.connect(operator).afterTurnRound();
            
            // Check balances and conversion rate
            const user1Balance = await stCoreToken.balanceOf(user1.address);
            const user2Balance = await stCoreToken.balanceOf(user2.address);
            const conversionRate = await stCoreToken.getConversionRate();
            
            expect(user1Balance).to.equal(ethers.utils.parseEther('50'));
            expect(user2Balance).to.equal(ethers.utils.parseEther('30'));
            expect(conversionRate).to.be.gt(ethers.utils.parseEther('1')); // Should have improved
            
            // User1 can convert stCORE back to more CORE due to rewards
            const coreValue = await stCoreToken.stCoreToCore(user1Balance);
            expect(coreValue).to.be.gt(ethers.utils.parseEther('50'));
        });

        it('Should maintain accurate accounting across operations', async function () {
            const { liquidStakingManager, stCoreToken, user1, user2 } = await loadFixture(deployLiquidStakingFixture);
            
            // Multiple stakes
            await liquidStakingManager.connect(user1).stake(ethers.constants.AddressZero, { value: ethers.utils.parseEther('25') });
            await liquidStakingManager.connect(user2).stake(ethers.constants.AddressZero, { value: ethers.utils.parseEther('15') });
            await liquidStakingManager.connect(user1).stake(ethers.constants.AddressZero, { value: ethers.utils.parseEther('10') });
            
            // Check totals
            const totalSupply = await stCoreToken.totalSupply();
            const totalStaked = await stCoreToken.totalStakedCore();
            const totalDelegated = await liquidStakingManager.getTotalDelegated();
            
            expect(totalSupply).to.equal(ethers.utils.parseEther('50'));
            expect(totalStaked).to.equal(ethers.utils.parseEther('50'));
            expect(totalDelegated).to.equal(ethers.utils.parseEther('50'));
            
            // Request partial unstaking
            await stCoreToken.connect(user1).approve(liquidStakingManager.address, ethers.utils.parseEther('20'));
            await liquidStakingManager.connect(user1).requestUnstake(ethers.utils.parseEther('20'));
            
            // Check balances are still consistent
            const user1Balance = await stCoreToken.balanceOf(user1.address);
            const user2Balance = await stCoreToken.balanceOf(user2.address);
            const contractBalance = await stCoreToken.balanceOf(liquidStakingManager.address);
            
            expect(user1Balance).to.equal(ethers.utils.parseEther('15')); // 35 - 20 transferred
            expect(user2Balance).to.equal(ethers.utils.parseEther('15'));
            expect(contractBalance).to.equal(ethers.utils.parseEther('20')); // Pending unstaking
        });
    });
});

describe('StCoreToken', function () {
    async function deployStCoreTokenFixture() {
        const [owner, manager, user1, user2] = await ethers.getSigners();
        
        const StCoreToken = await ethers.getContractFactory('StCoreToken');
        const stCoreToken = await StCoreToken.deploy();
        
        await stCoreToken.setLiquidStakingManager(manager.address);
        
        return { stCoreToken, owner, manager, user1, user2 };
    }

    describe('Token Operations', function () {
        it('Should mint tokens correctly', async function () {
            const { stCoreToken, manager, user1 } = await loadFixture(deployStCoreTokenFixture);
            
            const coreAmount = ethers.utils.parseEther('10');
            
            await expect(
                stCoreToken.connect(manager).mint(user1.address, coreAmount)
            ).to.emit(stCoreToken, 'Minted');
            
            const balance = await stCoreToken.balanceOf(user1.address);
            expect(balance).to.equal(coreAmount);
            
            const totalStaked = await stCoreToken.totalStakedCore();
            expect(totalStaked).to.equal(coreAmount);
        });

        it('Should burn tokens correctly', async function () {
            const { stCoreToken, manager, user1 } = await loadFixture(deployStCoreTokenFixture);
            
            const coreAmount = ethers.utils.parseEther('10');
            await stCoreToken.connect(manager).mint(user1.address, coreAmount);
            
            const burnAmount = ethers.utils.parseEther('4');
            
            await expect(
                stCoreToken.connect(manager).burn(user1.address, burnAmount)
            ).to.emit(stCoreToken, 'Burned');
            
            const balance = await stCoreToken.balanceOf(user1.address);
            expect(balance).to.equal(coreAmount.sub(burnAmount));
            
            const totalStaked = await stCoreToken.totalStakedCore();
            expect(totalStaked).to.equal(coreAmount.sub(burnAmount));
        });

        it('Should handle conversion rate updates', async function () {
            const { stCoreToken, manager, user1 } = await loadFixture(deployStCoreTokenFixture);
            
            const coreAmount = ethers.utils.parseEther('100');
            await stCoreToken.connect(manager).mint(user1.address, coreAmount);
            
            // Simulate rewards by updating total staked
            const newTotalStaked = ethers.utils.parseEther('110'); // 10% rewards
            await stCoreToken.connect(manager).updateTotalStakedCore(newTotalStaked);
            
            const conversionRate = await stCoreToken.getConversionRate();
            expect(conversionRate).to.equal(ethers.utils.parseEther('1.1')); // 1.1 CORE per stCORE
            
            // Test conversions
            const stCoreAmount = ethers.utils.parseEther('10');
            const expectedCore = await stCoreToken.stCoreToCore(stCoreAmount);
            expect(expectedCore).to.equal(ethers.utils.parseEther('11')); // 10 * 1.1
            
            const expectedStCore = await stCoreToken.coreToStCore(ethers.utils.parseEther('11'));
            expect(expectedStCore).to.equal(stCoreAmount);
        });

        it('Should only allow manager to mint/burn', async function () {
            const { stCoreToken, user1, user2 } = await loadFixture(deployStCoreTokenFixture);
            
            await expect(
                stCoreToken.connect(user1).mint(user2.address, ethers.utils.parseEther('10'))
            ).to.be.revertedWith('StCoreToken: caller is not liquid staking manager');
            
            await expect(
                stCoreToken.connect(user1).burn(user2.address, ethers.utils.parseEther('10'))
            ).to.be.revertedWith('StCoreToken: caller is not liquid staking manager');
        });
    });
});