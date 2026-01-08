import { createHandler, UserRole } from '@qops/hub-kit';
import { listFilesByUser, listAllFiles } from '../services/file.service.js';

/**
 * List files endpoint
 *
 * GET /api/files
 *
 * Lists files uploaded by the authenticated user.
 * Admins can see all files.
 */
export default createHandler(
  async (_request, _context, { user }) => {
    let files;

    // Admins can see all files, members only see their own
    if (user!.role === UserRole.ADMIN) {
      files = await listAllFiles();
    } else {
      files = listFilesByUser(user!.sub!);
    }

    return {
      status: 200,
      jsonBody: {
        files: files.map((f) => ({
          id: f.id,
          filename: f.filename,
          originalName: f.originalName,
          contentType: f.contentType,
          size: f.size,
          uploadedBy: f.uploadedBy,
          uploadedAt: f.uploadedAt,
        })),
        total: files.length,
      },
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
