// src/app/api/upload/route.js
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid'; // Use uuid instead of nanoid if available
import { mkdir } from 'fs/promises';
import { authMiddleware } from '@/lib/auth';

/**
 * Handles file uploads for restaurant logos
 * With error handling and base64 fallback
 */
const uploadHandler = async (req) => {
  try {
    // Try to parse formData
    let formData;
    try {
      formData = await req.formData();
    } catch (error) {
      // Check if this is a JSON request with base64 data instead
      const body = await req.json().catch(() => null);
      
      if (body && body.base64Data) {
        return handleBase64Upload(body);
      } else {
        return NextResponse.json(
          { success: false, message: 'Invalid request format' },
          { status: 400 }
        );
      }
    }
    
    // Handle file from form data
    const file = formData.get('logo');
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    const validFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validFileTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Only JPG, PNG, GIF and WEBP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'File size exceeds 2MB limit' },
        { status: 400 }
      );
    }

    try {
      // Create unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      
      // Make sure the directory exists
      const uploadDir = path.join(process.cwd(), 'public/uploads/logos');
      await mkdir(uploadDir, { recursive: true });
      
      // Write the file
      const filePath = path.join(uploadDir, fileName);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(filePath, buffer);
      
      // Return the URL path to the file
      const fileUrl = `/uploads/logos/${fileName}`;
      
      return NextResponse.json({
        success: true,
        message: 'File uploaded successfully',
        url: fileUrl
      });
    } catch (fsError) {
      console.error('Filesystem error:', fsError);
      
      // If filesystem write fails, attempt base64 fallback
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');
        const mimeType = file.type;
        const dataUrl = `data:${mimeType};base64,${base64Data}`;
        
        return NextResponse.json({
          success: true,
          message: 'File converted to base64',
          url: dataUrl,
          isBase64: true
        });
      } catch (base64Error) {
        console.error('Base64 conversion error:', base64Error);
        return NextResponse.json(
          { success: false, message: 'Failed to process file' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
};

// Handle base64 uploads directly
const handleBase64Upload = async (body) => {
  try {
    const { base64Data, fileName, mimeType } = body;
    
    if (!base64Data || !mimeType) {
      return NextResponse.json(
        { success: false, message: 'Missing required data' },
        { status: 400 }
      );
    }

    // For base64 data URLs, we can just return them directly
    if (base64Data.startsWith('data:')) {
      return NextResponse.json({
        success: true,
        message: 'Using provided data URL',
        url: base64Data,
        isBase64: true
      });
    }
    
    // If it's raw base64, try to save it to the filesystem
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Create unique filename
      const fileExt = (fileName?.split('.').pop()) || 
                     (mimeType === 'image/png' ? 'png' : 
                      mimeType === 'image/jpeg' ? 'jpg' : 
                      mimeType === 'image/gif' ? 'gif' : 'webp');
                      
      const newFileName = `${uuidv4()}.${fileExt}`;
      
      // Make sure the directory exists
      const uploadDir = path.join(process.cwd(), 'public/uploads/logos');
      await mkdir(uploadDir, { recursive: true });
      
      // Write the file
      const filePath = path.join(uploadDir, newFileName);
      await writeFile(filePath, buffer);
      
      // Return the URL path to the file
      const fileUrl = `/uploads/logos/${newFileName}`;
      
      return NextResponse.json({
        success: true,
        message: 'Base64 file saved successfully',
        url: fileUrl
      });
    } catch (fsError) {
      console.error('Filesystem error with base64:', fsError);
      
      // If filesystem fails, return the data URL
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      return NextResponse.json({
        success: true,
        message: 'Using base64 data URL as fallback',
        url: dataUrl,
        isBase64: true
      });
    }
  } catch (error) {
    console.error('Error processing base64 data:', error);
    return NextResponse.json(
      { success: false, message: 'Server error processing base64 data' },
      { status: 500 }
    );
  }
};

export const POST = authMiddleware(uploadHandler);