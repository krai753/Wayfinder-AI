"""
Wayfinder Backend — CS Agent Dashboard Router
Real-time ticket management and agent-user messaging.
"""
import uuid
import logging
from fastapi import APIRouter, HTTPException, Query
from database import (
    create_cs_ticket, get_cs_tickets, get_cs_ticket,
    update_cs_ticket, add_cs_message, get_cs_messages,
)
from config import settings

router = APIRouter(prefix="/api/cs", tags=["cs_dashboard"])
logger = logging.getLogger("wayfinder.cs_dashboard")


@router.get("/tickets")
async def list_tickets(status: str = "", limit: int = 50):
    """List CS tickets, optionally filtered by status (open/assigned/closed)."""
    tickets = get_cs_tickets(status)
    # Add message count for each ticket
    result = []
    for t in tickets[:limit]:
        msgs = get_cs_messages(t["id"])
        t["message_count"] = len(msgs)
        t["last_message"] = msgs[-1]["message"] if msgs else ""
        result.append(t)
    return {"tickets": result, "count": len(result), "status_filter": status or "all"}


@router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str):
    """Get a single ticket with its messages."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    messages = get_cs_messages(ticket_id)
    ticket["messages"] = messages
    return ticket


@router.post("/tickets/{ticket_id}/assign")
async def assign_ticket(ticket_id: str, agent_id: str = Query("", description="Agent ID to assign")):
    """Assign a ticket to an agent."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    update_cs_ticket(ticket_id, status="assigned", agent_id=agent_id or "agent_default")
    # Add system message
    add_cs_message(ticket_id, "system", f"Ticket assigned to agent {agent_id or 'default'}")
    return {"status": "assigned", "ticket_id": ticket_id, "agent_id": agent_id or "agent_default"}


@router.post("/tickets/{ticket_id}/message")
async def send_message(ticket_id: str, sender: str = Query("agent", description="sender: agent or user"), message: str = Query(..., description="Message text")):
    """Send a message on a ticket (from agent or user)."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    msg = add_cs_message(ticket_id, sender, message)
    return msg


@router.get("/tickets/{ticket_id}/messages")
async def get_ticket_messages(ticket_id: str):
    """Get all messages for a ticket."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    messages = get_cs_messages(ticket_id)
    return {"ticket_id": ticket_id, "messages": messages, "count": len(messages)}


@router.post("/tickets/{ticket_id}/close")
async def close_ticket(ticket_id: str):
    """Close a CS ticket."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    update_cs_ticket(ticket_id, status="closed")
    add_cs_message(ticket_id, "system", "Ticket closed")
    return {"status": "closed", "ticket_id": ticket_id}


# ═══════════════════════════════════════════════════════════════════
# CALL SYSTEM — Phone-like voice relay
# ═══════════════════════════════════════════════════════════════════


@router.post("/tickets/{ticket_id}/call")
async def initiate_call(ticket_id: str, agent_id: str = Query("", description="Agent name")):
    """Agent initiates a call to the user. Status → calling."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    update_cs_ticket(ticket_id, call_status="calling", call_agent=agent_id or "Agent")
    add_cs_message(ticket_id, "system", f"📞 Agent {agent_id or 'Agent'} is calling...")
    return {"status": "calling", "ticket_id": ticket_id, "call_agent": agent_id or "Agent", "call_status": "calling"}


@router.post("/tickets/{ticket_id}/call/accept")
async def accept_call(ticket_id: str):
    """User accepts the call. Status → in_call."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    update_cs_ticket(ticket_id, call_status="in_call")
    add_cs_message(ticket_id, "system", "📞 Call connected — voice relay active")
    return {"status": "in_call", "ticket_id": ticket_id, "call_status": "in_call"}


@router.post("/tickets/{ticket_id}/call/end")
async def end_call(ticket_id: str):
    """End the call. Status → assigned (still open for chat)."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    update_cs_ticket(ticket_id, call_status="ended")
    add_cs_message(ticket_id, "system", "📞 Call ended")
    return {"status": "assigned", "ticket_id": ticket_id, "call_status": "ended"}


@router.get("/tickets/{ticket_id}/call/status")
async def get_call_status(ticket_id: str):
    """Check the current call status for a ticket."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {
        "ticket_id": ticket_id,
        "call_status": ticket.get("call_status", "none"),
        "call_agent": ticket.get("call_agent", ""),
        "status": ticket["status"],
    }