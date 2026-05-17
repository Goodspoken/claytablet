"""LAN IP detection + QR-code printing for self-hosted setup."""
import os
import socket


def get_local_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def print_lan_qr() -> None:
    """Print an ASCII QR code with the LAN URL for quick mobile pairing."""
    try:
        import qrcode
    except ImportError:
        return

    host_url = os.getenv("HOST_URL", "http://localhost:8000")
    if "localhost" in host_url or "127.0.0.1" in host_url:
        lan_ip = get_local_ip()
        url = host_url.replace("localhost", lan_ip).replace("127.0.0.1", lan_ip)
    else:
        url = host_url

    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    print("\n\033[1;32m=== Scan to connect to DubTab ===\033[0m")
    print(f"URL: \033[1;36m{url}\033[0m\n")
    qr.print_ascii(invert=True)
    print("\n")
