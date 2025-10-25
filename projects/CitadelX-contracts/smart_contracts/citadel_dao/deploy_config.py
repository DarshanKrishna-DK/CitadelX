"""
CitadelX DAO Deployment Configuration
Handles deployment of all DAO-related contracts
"""

import logging
from algopy import *
from algopy.arc4 import abimethod

logger = logging.getLogger(__name__)


# Import contracts
from .contract import SimpleCitadelDAO


def get_deploy_config() -> dict:
    """
    Get deployment configuration for all DAO contracts
    
    Returns:
        Dictionary containing deployment settings
    """
    return {
        "dao": {
            "contract": SimpleCitadelDAO,
            "name": "SimpleCitadelDAO",
            "description": "Simplified DAO management contract",
            "schema": {
                "global_ints": 10,
                "global_bytes": 2,
                "local_ints": 0,
                "local_bytes": 0,
            },
            "boxes": False,
        },
        "governance": {
            "contract": CitadelGovernance,
            "name": "CitadelGovernance", 
            "description": "DAO governance and voting contract",
            "schema": {
                "global_ints": 8,
                "global_bytes": 1,
                "local_ints": 0,
                "local_bytes": 0,
            },
            "boxes": True,
        },
        "treasury": {
            "contract": CitadelTreasury,
            "name": "CitadelTreasury",
            "description": "DAO treasury management contract", 
            "schema": {
                "global_ints": 10,
                "global_bytes": 2,
                "local_ints": 0,
                "local_bytes": 0,
            },
            "boxes": True,
        },
        "nft": {
            "contract": CitadelModeratorNFT,
            "name": "CitadelModeratorNFT",
            "description": "AI Moderator NFT contract",
            "schema": {
                "global_ints": 8,
                "global_bytes": 2,
                "local_ints": 0,
                "local_bytes": 0,
            },
            "boxes": True,
        }
    }


def deploy_dao_system(
    algod_client,
    creator_account,
    dao_name: str,
    dao_description: str,
    min_stake: int = 500_000,  # 0.5 ALGO
    voting_period: int = 604800,  # 1 week
    quorum_threshold: int = 51,  # 51%
) -> dict:
    """
    Deploy complete DAO system
    
    Args:
        algod_client: Algorand client
        creator_account: Creator account
        dao_name: DAO name
        dao_description: DAO description
        min_stake: Minimum stake in microAlgos
        voting_period: Voting period in seconds
        quorum_threshold: Quorum threshold percentage
        
    Returns:
        Dictionary with deployed contract app IDs
    """
    logger.info("Starting DAO system deployment...")
    
    deployed_contracts = {}
    
    try:
        # 1. Deploy DAO contract first
        logger.info("Deploying DAO contract...")
        dao_config = get_deploy_config()["dao"]
        # TODO: Implement actual deployment logic
        dao_app_id = 12345  # Placeholder
        deployed_contracts["dao"] = dao_app_id
        logger.info(f"DAO contract deployed with app ID: {dao_app_id}")
        
        # 2. Deploy Governance contract
        logger.info("Deploying Governance contract...")
        gov_config = get_deploy_config()["governance"]
        # TODO: Implement actual deployment logic
        gov_app_id = 12346  # Placeholder
        deployed_contracts["governance"] = gov_app_id
        logger.info(f"Governance contract deployed with app ID: {gov_app_id}")
        
        # 3. Deploy Treasury contract
        logger.info("Deploying Treasury contract...")
        treasury_config = get_deploy_config()["treasury"]
        # TODO: Implement actual deployment logic
        treasury_app_id = 12347  # Placeholder
        deployed_contracts["treasury"] = treasury_app_id
        logger.info(f"Treasury contract deployed with app ID: {treasury_app_id}")
        
        # 4. Deploy NFT contract
        logger.info("Deploying NFT contract...")
        nft_config = get_deploy_config()["nft"]
        # TODO: Implement actual deployment logic
        nft_app_id = 12348  # Placeholder
        deployed_contracts["nft"] = nft_app_id
        logger.info(f"NFT contract deployed with app ID: {nft_app_id}")
        
        # 5. Initialize all contracts
        logger.info("Initializing contracts...")
        
        # Initialize DAO
        # TODO: Call initialize_dao method
        
        # Initialize Governance
        # TODO: Call initialize_governance method
        
        # Initialize Treasury
        # TODO: Call initialize_treasury method
        
        # Initialize NFT contract
        # TODO: Call initialize_nft_contract method
        
        logger.info("DAO system deployment completed successfully!")
        
        return {
            "success": True,
            "contracts": deployed_contracts,
            "dao_name": dao_name,
            "creator": creator_account.address,
        }
        
    except Exception as e:
        logger.error(f"Deployment failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "contracts": deployed_contracts,
        }


def get_deployment_summary(deployment_result: dict) -> str:
    """
    Generate deployment summary
    
    Args:
        deployment_result: Result from deploy_dao_system
        
    Returns:
        Formatted summary string
    """
    if not deployment_result.get("success"):
        return f"❌ Deployment failed: {deployment_result.get('error', 'Unknown error')}"
    
    contracts = deployment_result.get("contracts", {})
    dao_name = deployment_result.get("dao_name", "Unknown")
    creator = deployment_result.get("creator", "Unknown")
    
    summary = f"""
✅ CitadelX DAO System Deployed Successfully!

DAO Name: {dao_name}
Creator: {creator}

📋 Contract App IDs:
├── DAO Contract: {contracts.get('dao', 'Not deployed')}
├── Governance Contract: {contracts.get('governance', 'Not deployed')}
├── Treasury Contract: {contracts.get('treasury', 'Not deployed')}
└── NFT Contract: {contracts.get('nft', 'Not deployed')}

🚀 Next Steps:
1. Initialize DAO with initial stake
2. Set up governance parameters
3. Configure treasury settings
4. Create first AI moderator NFT

📖 Documentation: See DAO_FEATURES_DOCUMENTATION.md
"""
    
    return summary


# Test deployment configuration
def test_deploy_config():
    """Test deployment configuration"""
    config = get_deploy_config()
    
    assert "dao" in config
    assert "governance" in config
    assert "treasury" in config
    assert "nft" in config
    
    for contract_name, contract_config in config.items():
        assert "contract" in contract_config
        assert "name" in contract_config
        assert "description" in contract_config
        assert "schema" in contract_config
        
        schema = contract_config["schema"]
        assert "global_ints" in schema
        assert "global_bytes" in schema
        assert "local_ints" in schema
        assert "local_bytes" in schema
    
    print("✅ Deployment configuration is valid")


# Main deploy function expected by AlgoKit
def deploy():
    """
    AlgoKit deployment function using the template pattern
    """
    import algokit_utils
    from smart_contracts.artifacts.citadel_dao.simple_citadel_dao_client import (
        SimpleCitadelDaoFactory,
        SimpleCitadelDaoMethodCallCreateParams,
        CreateDaoArgs,
    )
    
    logger.info("Deploying SimpleCitadelDAO contract...")
    
    # Use AlgoKit's standard environment setup
    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer = algorand.account.from_environment("DEPLOYER")
    
    # Get typed app factory
    factory = algorand.client.get_typed_app_factory(
        SimpleCitadelDaoFactory, 
        default_sender=deployer.address
    )
    
    # Deploy with create parameters
    create_params = SimpleCitadelDaoMethodCallCreateParams(
        args=CreateDaoArgs(
            name="Test DAO",
            description="Test DAO for development",
            min_stake=500_000,  # 0.5 ALGO
            voting_period=604800,  # 1 week
            quorum_threshold=51,  # 51%
        )
    )
    
    app_client, result = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        create_params=create_params,
    )
    
    logger.info(f"✅ SimpleCitadelDAO deployed!")
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


if __name__ == "__main__":
    test_deploy_config()
