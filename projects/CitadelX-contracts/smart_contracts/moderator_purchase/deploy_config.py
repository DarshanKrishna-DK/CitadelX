import logging
import os
from algopy import Account
from algokit_utils import ApplicationClient, ApplicationSpecification, get_algod_client, get_indexer_client
from algosdk.v2client.algod import AlgodClient
from algosdk import account, mnemonic

from smart_contracts.moderator_purchase.contract import ModeratorPurchaseContract

logger = logging.getLogger(__name__)


def deploy_contract(
    algod_client: AlgodClient,
    deployer_account: Account,
    creator_address: str,
    hourly_price_algo: float = 0.1,
    monthly_price_algo: float = 1.0,
    buyout_price_algo: float = 5.0,
) -> tuple[int, str]:
    """
    Deploy the ModeratorPurchaseContract to the Algorand network.
    
    Args:
        algod_client: Algorand client
        deployer_account: Account deploying the contract
        creator_address: Address of the moderator creator
        hourly_price_algo: Price per hour in ALGO
        monthly_price_algo: Price per month in ALGO
        buyout_price_algo: Buyout price in ALGO
        
    Returns:
        Tuple of (app_id, app_address)
    """
    
    # Create application specification
    app_spec = ApplicationSpecification(
        app=ModeratorPurchaseContract(),
    )
    
    # Create application client
    client = ApplicationClient(
        algod_client,
        app_spec=app_spec,
        signer=deployer_account.signer,
        sender=deployer_account.address,
    )
    
    logger.info("Deploying ModeratorPurchaseContract...")
    
    # Deploy the contract
    app_id, app_address, txn_id = client.create(
        "create_moderator",
        creator=creator_address,
        hourly_price_algo=int(hourly_price_algo),
        monthly_price_algo=int(monthly_price_algo),
        buyout_price_algo=int(buyout_price_algo),
    )
    
    logger.info(f"✅ ModeratorPurchaseContract deployed!")
    logger.info(f"   App ID: {app_id}")
    logger.info(f"   App Address: {app_address}")
    logger.info(f"   Transaction ID: {txn_id}")
    logger.info(f"   Creator: {creator_address}")
    logger.info(f"   Pricing: {hourly_price_algo} ALGO/hr, {monthly_price_algo} ALGO/mo, {buyout_price_algo} ALGO buyout")
    
    # Fund the contract for inner transactions (MBR for payments)
    fund_amount = 200_000  # 0.2 ALGO
    client.fund(fund_amount)
    logger.info(f"💰 Contract funded with {fund_amount / 1_000_000} ALGO for inner transactions")
    
    return app_id, app_address


def get_contract_client(
    algod_client: AlgodClient,
    app_id: int,
    signer_account: Account,
) -> ApplicationClient:
    """
    Get an ApplicationClient for an existing ModeratorPurchaseContract.
    
    Args:
        algod_client: Algorand client
        app_id: Application ID of the deployed contract
        signer_account: Account to use for signing transactions
        
    Returns:
        ApplicationClient instance
    """
    app_spec = ApplicationSpecification(
        app=ModeratorPurchaseContract(),
    )
    
    return ApplicationClient(
        algod_client,
        app_spec=app_spec,
        app_id=app_id,
        signer=signer_account.signer,
        sender=signer_account.address,
    )


# Main deploy function expected by AlgoKit
def deploy_for_algokit(
    algod_client: AlgodClient,
    indexer_client,
    deployer_account: Account,
    app_spec,
):
    """
    Main deployment function called by AlgoKit
    
    Args:
        algod_client: Algorand client
        indexer_client: Indexer client (unused)
        deployer_account: Deployer account
        app_spec: Application specification
        
    Returns:
        Deployment result
    """
    logger.info("Deploying ModeratorPurchaseContract...")
    
    # Deploy with default pricing
    app_id, app_address = deploy_contract(
        algod_client=algod_client,
        deployer_account=deployer_account,
        creator_address=deployer_account.address,
        hourly_price_algo=0.1,
        monthly_price_algo=1.0,
        buyout_price_algo=5.0,
    )
    
    return {
        "app_id": app_id,
        "app_address": app_address,
    }

# Main deploy function expected by AlgoKit
def deploy():
    """
    AlgoKit deployment function using the template pattern
    """
    import algokit_utils
    from smart_contracts.artifacts.moderator_purchase.moderator_purchase_contract_client import (
        ModeratorPurchaseContractFactory,
        ModeratorPurchaseContractMethodCallCreateParams,
        CreateModeratorArgs,
    )
    
    logger.info("Deploying ModeratorPurchaseContract...")
    
    # Use AlgoKit's standard environment setup
    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer = algorand.account.from_environment("DEPLOYER")
    
    # Get typed app factory
    factory = algorand.client.get_typed_app_factory(
        ModeratorPurchaseContractFactory, 
        default_sender=deployer.address
    )
    
    # Deploy with create parameters
    create_params = ModeratorPurchaseContractMethodCallCreateParams(
        args=CreateModeratorArgs(
            creator=deployer.address,
            hourly_price_algo=1,  # 0.1 ALGO (in microALGOs)
            monthly_price_algo=10,  # 1.0 ALGO (in microALGOs)
            buyout_price_algo=50,  # 5.0 ALGO (in microALGOs)
        )
    )
    
    app_client, result = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        create_params=create_params,
    )
    
    logger.info(f"✅ ModeratorPurchaseContract deployed!")
    logger.info(f"   App ID: {app_client.app_id}")
    logger.info(f"   App Address: {app_client.app_address}")
    logger.info(f"   Operation: {result.operation_performed}")
    
    # Fund the contract for operations
    if result.operation_performed in [
        algokit_utils.OperationPerformed.Create,
        algokit_utils.OperationPerformed.Replace,
    ]:
        algorand.send.payment(
            algokit_utils.PaymentParams(
                amount=algokit_utils.AlgoAmount(algo=0.2),
                sender=deployer.address,
                receiver=app_client.app_address,
            )
        )
        logger.info(f"💰 Contract funded with 0.2 ALGO")
    
    return {
        "app_id": app_client.app_id,
        "app_address": app_client.app_address,
        "operation": result.operation_performed.value
    }
