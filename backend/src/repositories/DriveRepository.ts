export class DriveRepository {
  private static FOLDER_NAME = 'BDMS_Staff_Immunity_Evidence_Storage';

  /**
   * Retrieves or creates the dedicated Evidence Storage folder in Google Drive.
   */
  private getStorageFolder(): GoogleAppsScript.Drive.Folder {
    const folders = DriveApp.getFoldersByName(DriveRepository.FOLDER_NAME);
    if (folders.hasNext()) {
      return folders.next();
    }
    const folder = DriveApp.createFolder(DriveRepository.FOLDER_NAME);
    // Explicitly revoke public access to guarantee privacy
    folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    return folder;
  }

  /**
   * Saves uploaded Base64 file content to Google Drive.
   * File is renamed to `documentUuid.ext` (NO Staff Name in Drive filename!).
   * NO Public Sharing Link is created.
   */
  public saveFile(documentUuid: string, ext: string, base64Content: string, mimeType: string): { driveFileId: string; fileSizeByte: number } {
    const folder = this.getStorageFolder();
    const bytes = Utilities.base64Decode(base64Content);
    const blob = Utilities.newBlob(bytes, mimeType, `${documentUuid}.${ext}`);

    const file = folder.createFile(blob);
    // Guarantee Private Sharing
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

    return {
      driveFileId: file.getId(),
      fileSizeByte: bytes.length
    };
  }

  /**
   * Fetches file content from Drive by internal DriveFileID.
   */
  public getFileAsBase64(driveFileId: string): { base64: string; mimeType: string } | null {
    try {
      const file = DriveApp.getFileById(driveFileId);
      const blob = file.getBlob();
      const base64 = Utilities.base64Encode(blob.getBytes());
      return { base64, mimeType: blob.getContentType() };
    } catch {
      return null;
    }
  }

  /**
   * Trashes a file in Drive.
   */
  public deleteFile(driveFileId: string): boolean {
    try {
      const file = DriveApp.getFileById(driveFileId);
      file.setTrashed(true);
      return true;
    } catch {
      return false;
    }
  }
}
