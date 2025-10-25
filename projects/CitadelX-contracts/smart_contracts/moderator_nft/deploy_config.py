import logging

from algokit_utils import (
    ApplicationClient,
    ensure_funded,
)
from algosdk.v2client.algod import AlgodClient
from algosdk.v2client.indexer import IndexerClient

logger = logging.getLogger(__name__)


# Define deployment behavior
def deploy():
    """
    AlgoKit deployment function using the template pattern
    """
    import algokit_utils
    from smart_contracts.artifacts.moderator_nft.moderator_nft_client import (
        ModeratorNftFactory,
    )
    
    logger.info("Deploying ModeratorNFT...")
    
    # Use AlgoKit's standard environment setup
    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer = algorand.account.from_environment("DEPLOYER")
    
    # Get typed app factory
    factory = algorand.client.get_typed_app_factory(
        ModeratorNftFactory, 
        default_sender=deployer.address
    )
    
    # Deploy with bare create (no parameters)
    app_client, result = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )
    
    logger.info(f"✅ ModeratorNFT deployed!")
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





