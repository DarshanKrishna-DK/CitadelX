// IPFS Upload using Pinata API (more reliable than direct IPFS)
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY
const IPFS_GATEWAY_URL = import.meta.env.VITE_IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/'

// Check if IPFS credentials are configured
const isIPFSConfigured = PINATA_API_KEY && PINATA_SECRET_API_KEY

export interface IPFSUploadResult {
  hash: string
  url: string
}

/**
 * Upload context documents to IPFS using Pinata
 * Creates a single JSON file containing all document contents and metadata
 */
export async function uploadContextDocuments(files: File[]): Promise<IPFSUploadResult> {
  if (!isIPFSConfigured) {
    throw new Error('IPFS configuration missing. Please add VITE_PINATA_API_KEY and VITE_PINATA_SECRET_API_KEY to your .env file.')
  }

  try {
    // Read all files and create a single JSON structure
    const documentsData = await Promise.all(
      files.map(async (file) => {
        const content = await file.text()
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          content: content,
          lastModified: file.lastModified,
        }
      })
    )

    // Create comprehensive metadata
    const contextPackage = {
      metadata: {
        name: 'AI Moderator Context Documents',
        description: 'Training context for AI moderator',
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        uploadedAt: new Date().toISOString(),
        version: '1.0',
        project: 'CitadelX'
      },
      documents: documentsData
    }

    // Upload as JSON to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': PINATA_API_KEY!,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY!,
      },
      body: JSON.stringify({
        pinataContent: contextPackage,
        pinataMetadata: {
          name: `CitadelX_Context_Documents_${Date.now()}`,
          keyvalues: {
            type: 'context_documents',
            project: 'CitadelX',
            fileCount: files.length.toString(),
            timestamp: new Date().toISOString()
          }
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Pinata upload failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    const hash = result.IpfsHash
    const url = `${IPFS_GATEWAY_URL}${hash}`

    console.log('Successfully uploaded context documents to IPFS:', { hash, url, fileCount: files.length })
    return { hash, url }
  } catch (error) {
    console.error('Error uploading to IPFS:', error)
    throw new Error('Failed to upload context documents to IPFS. Please check your IPFS configuration.')
  }
}

/**
 * Upload single file to IPFS using Pinata
 */
export async function uploadFile(file: File): Promise<IPFSUploadResult> {
  if (!isIPFSConfigured) {
    throw new Error('IPFS configuration missing. Please add VITE_PINATA_API_KEY and VITE_PINATA_SECRET_API_KEY to your .env file.')
  }

  try {
    const formData = new FormData()
    formData.append('file', file)

    const pinataMetadata = {
      name: `CitadelX_File_${file.name}_${Date.now()}`,
      keyvalues: {
        type: 'single_file',
        project: 'CitadelX',
        originalName: file.name,
        timestamp: new Date().toISOString()
      }
    }
    formData.append('pinataMetadata', JSON.stringify(pinataMetadata))

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': PINATA_API_KEY!,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY!,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Pinata upload failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    const hash = result.IpfsHash
    const url = `${IPFS_GATEWAY_URL}${hash}`
    
    return { hash, url }
  } catch (error) {
    console.error('Error uploading file to IPFS:', error)
    throw new Error('Failed to upload file to IPFS')
  }
}

/**
 * Upload JSON metadata to IPFS using Pinata
 */
export async function uploadMetadata(metadata: any): Promise<IPFSUploadResult> {
  if (!isIPFSConfigured) {
    throw new Error('IPFS configuration missing. Please add VITE_PINATA_API_KEY and VITE_PINATA_SECRET_API_KEY to your .env file.')
  }

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': PINATA_API_KEY!,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY!,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `CitadelX_Metadata_${Date.now()}`,
          keyvalues: {
            type: 'metadata',
            project: 'CitadelX',
            timestamp: new Date().toISOString()
          }
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Pinata upload failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    const hash = result.IpfsHash
    const url = `${IPFS_GATEWAY_URL}${hash}`
    
    return { hash, url }
  } catch (error) {
    console.error('Error uploading metadata to IPFS:', error)
    throw new Error('Failed to upload metadata to IPFS')
  }
}

/**
 * Retrieve content from IPFS
 */
export async function getFromIPFS(hash: string): Promise<string> {
  try {
    const response = await fetch(`${IPFS_GATEWAY_URL}${hash}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.status}`)
    }
    
    const content = await response.text()
    return content
  } catch (error) {
    console.error('Error retrieving from IPFS:', error)
    throw new Error('Failed to retrieve content from IPFS')
  }
}

