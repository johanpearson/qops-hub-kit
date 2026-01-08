import { createHandler, UserRole, AppError, ErrorCode } from '@qops/hub-kit';
import { getFileById } from '../services/file.service.js';
import { readFile } from 'node:fs/promises';

/**
 * Download file endpoint
 *
 * GET /api/files/{id}
 *
 * Downloads a file by ID.
 * Users can only download their own files unless they're admins.
 */
export default createHandler(
  async (request, _context, { user }) => {
    const fileId = request.params.id;

    if (!fileId) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'File ID is required');
    }

    const file = getFileById(fileId);

    if (!file) {
      throw new AppError(ErrorCode.NOT_FOUND, 'File not found');
    }

    // Check permissions: user can only download their own files unless admin
    if (file.uploadedBy !== user!.sub && user!.role !== UserRole.ADMIN) {
      throw new AppError(ErrorCode.FORBIDDEN, 'You do not have permission to access this file');
    }

    // Read file from storage
    const fileBuffer = await readFile(file.path);

    return {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.originalName}"`,
        'Content-Length': file.size.toString(),
      },
      body: fileBuffer,
    };
  },
  {
    jwtConfig: {
      secret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    },
    requiredRoles: [UserRole.MEMBER, UserRole.ADMIN],
    enableLogging: true,
  },
);
