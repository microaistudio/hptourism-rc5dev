import net from "net";
import { config } from "@shared/config";
import { logger } from "../logger";

export type ClamScanResult =
  | { status: "disabled" | "skipped" }
  | { status: "clean" }
  | { status: "infected"; signature: string }
  | { status: "error"; error: string };

class ClamAVService {
  private enabled = config.clamav.enabled;
  private readonly host = config.clamav.host;
  private readonly port = config.clamav.port;
  private readonly timeoutMs = config.clamav.timeoutMs;

  isEnabled() {
    return this.enabled;
  }

  setEnabled(value: boolean) {
    this.enabled = value;
    logger.info({ enabled: value }, "[clamav] scanning toggle updated");
  }

  async scanBuffer(buffer: Buffer): Promise<ClamScanResult> {
    if (!this.enabled) {
      return { status: "disabled" };
    }

    try {
      const response = await this.sendInstream(buffer);
      if (response.includes("OK")) {
        return { status: "clean" };
      }
      if (response.includes("FOUND")) {
        const [, signature = "UNKNOWN"] = response.split("FOUND");
        return { status: "infected", signature: signature.trim() };
      }
      return { status: "error", error: response };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ err: message }, "[clamav] scan failed");
      return { status: "error", error: message };
    }
  }

  private sendInstream(payload: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let resolved = false;
      const timeout = setTimeout(() => {
        socket.destroy();
        if (!resolved) {
          resolved = true;
          reject(new Error("ClamAV scan timed out"));
        }
      }, this.timeoutMs);

      socket.once("error", (err) => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });

      socket.connect(this.port, this.host, () => {
        socket.write("nINSTREAM\n");

        const chunkSize = 1024 * 32;
        for (let offset = 0; offset < payload.length; offset += chunkSize) {
          const chunk = payload.subarray(offset, offset + chunkSize);
          const sizeBuffer = Buffer.alloc(4);
          sizeBuffer.writeUInt32BE(chunk.length, 0);
          socket.write(sizeBuffer);
          socket.write(chunk);
        }

        socket.write(Buffer.alloc(4)); // zero-length chunk
      });

      let data = "";
      socket.on("data", (chunk) => {
        data += chunk.toString();
      });

      socket.on("close", () => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          resolve(data.trim());
        }
      });
    });
  }
}

export const clamavService = new ClamAVService();
