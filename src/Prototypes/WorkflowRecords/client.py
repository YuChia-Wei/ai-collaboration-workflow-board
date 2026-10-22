"""Executable composition for the local HTTP CLI."""
from .Adapters.Outbound.http_client import request, submit, validate_outbox
from .Adapters.Inbound.cli import main

if __name__=='__main__': main()
