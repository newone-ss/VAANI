import pytest
from src.policy.audit_ledger import AuditLedger

def test_audit_ledger_genesis_and_chaining():
    ledger = AuditLedger()
    assert ledger.total_blocks == 1  # Genesis block
    
    b1 = ledger.append_decision(
        call_id="CALL-101",
        speaker_id="CEO_01",
        risk_score=25.0,
        policy_state="NORMAL",
        action="ALLOW",
        reasons=[],
    )
    assert b1.index == 1
    assert len(b1.block_hash) == 64
    assert ledger.total_blocks == 2

    # Block 2
    b2 = ledger.append_decision(
        call_id="CALL-101",
        speaker_id="CEO_01",
        risk_score=82.0,
        policy_state="STEP_UP_MFA",
        action="CHALLENGE_MFA",
        reasons=["Synthetic vocoder detected"],
    )
    assert b2.index == 2
    assert b2.prev_hash == b1.block_hash

    # Verify integrity
    is_valid, error = ledger.verify_integrity()
    assert is_valid is True
    assert error is None

def test_audit_ledger_detects_tampering():
    ledger = AuditLedger()
    
    ledger.append_decision("CALL-1", "CEO_01", 10.0, "NORMAL", "ALLOW", [])
    ledger.append_decision("CALL-2", "CEO_01", 85.0, "STEP_UP_MFA", "CHALLENGE_MFA", ["Impostor"])

    # Adversary tries to tamper with Block 2 (retroactively lowering risk score)
    ledger._chain[2].risk_score = 5.0

    is_valid, error = ledger.verify_integrity()
    assert is_valid is False
    assert "Tamper detected" in error
