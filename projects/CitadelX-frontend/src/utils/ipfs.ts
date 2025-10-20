import { create } from 'ipfs-http-client'

// IPFS configuration - using public gateway for demo
const IPFS_CONFIG = {
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: 'Basic ' + btoa('2FdliMGfQRPjZL5Cy6LKHkHfXhd:c2f9a2b9c8f7e6d5a4b3c2d1e0f9g8h7'),
  },
}

// Create IPFS client
const ipfs = create(IPFS_CONFIG)

export interface IPFSUploadResult {
  hash: string
  url: string
}

/**
 * Upload context documents to IPFS
 */
export async function uploadContextDocuments(files: File[]): Promise<IPFSUploadResult> {
  try {
    // Create a directory with all context documents
    const fileObjects = await Promise.all(
      files.map(async (file) => ({
        path: file.name,
        content: new Uint8Array(await file.arrayBuffer()),
      }))
    )

    // Add metadata file
    const metadata = {
      name: 'AI Moderator Context Documents',
      description: 'Training context for AI moderator',
      files: files.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
      })),
      uploadedAt: new Date().toISOString(),
    }

    fileObjects.push({
      path: 'metadata.json',
      content: new TextEncoder().encode(JSON.stringify(metadata, null, 2)),
    })

    // Upload to IPFS
    const results = []
    for await (const result of ipfs.addAll(fileObjects, { wrapWithDirectory: true })) {
      results.push(result)
    }

    // Get the directory hash (last result)
    const directoryResult = results[results.length - 1]
    const hash = directoryResult.cid.toString()
    const url = `https://ipfs.io/ipfs/${hash}`

    return { hash, url }
  } catch (error) {
    console.error('Error uploading to IPFS:', error)
    throw new Error('Failed to upload context documents to IPFS')
  }
}

/**
 * Upload single file to IPFS
 */
export async function uploadFile(file: File): Promise<IPFSUploadResult> {
  try {
    const result = await ipfs.add(new Uint8Array(await file.arrayBuffer()))
    const hash = result.cid.toString()
    const url = `https://ipfs.io/ipfs/${hash}`
    
    return { hash, url }
  } catch (error) {
    console.error('Error uploading file to IPFS:', error)
    throw new Error('Failed to upload file to IPFS')
  }
}

/**
 * Upload JSON metadata to IPFS
 */
export async function uploadMetadata(metadata: any): Promise<IPFSUploadResult> {
  try {
    const content = JSON.stringify(metadata, null, 2)
    const result = await ipfs.add(content)
    const hash = result.cid.toString()
    const url = `https://ipfs.io/ipfs/${hash}`
    
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
    const chunks = []
    for await (const chunk of ipfs.cat(hash)) {
      chunks.push(chunk)
    }
    
    const content = new TextDecoder().decode(Buffer.concat(chunks))
    return content
  } catch (error) {
    console.error('Error retrieving from IPFS:', error)
    throw new Error('Failed to retrieve content from IPFS')
  }
}
