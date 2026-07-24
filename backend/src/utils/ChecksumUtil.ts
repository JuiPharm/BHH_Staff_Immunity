export class ChecksumUtil {
  /**
   * Computes SHA-256 Checksum (Hex string) from byte array or string.
   */
  public static computeSha256(data: string | number[]): string {
    const rawBytes = typeof data === 'string' ? Utilities.newBlob(data).getBytes() : data;
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawBytes);
    return digest.map((b) => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
  }

  /**
   * Compares two SHA-256 checksums.
   */
  public static isDuplicateChecksum(hashA: string, hashB: string): boolean {
    if (!hashA || !hashB) return false;
    return hashA.toLowerCase() === hashB.toLowerCase();
  }
}
