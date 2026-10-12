"""Executable composition for the local HTTP CLI."""
from .adapters.outbound.http_client import request, submit, validate_outbox
from .adapters.inbound.cli import main

if __name__=='__main__': main()
