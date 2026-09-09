import hashlib
import json
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

class AuditBlock:
    """A cryptographically sealed block in the tamper-evident audit ledger."""

    def __init__(
        self,
        index: int,
        timestamp: str,
        call_id: str,
        speaker_id: str,
        risk_score: float,
        policy_state: str,
        action: str,
        reasons: List[str],
        prev_hash: str,
    ):
        self.index = index
        self.timestamp = timestamp
        self.call_id = call_id
        self.speaker_id = speaker_id
        self.risk_score = round(risk_score, 2)
        self.policy_state = policy_state
        self.action = action
        self.reasons = reasons
        self.prev_hash = prev_hash
        self.block_hash = self.compute_hash()

    def compute_hash(self) -> str:
        """Computes SHA-256 digest of block header and payload."""
        block_dict = {
            "index": self.index,
            "timestamp": self.timestamp,
            "call_id": self.call_id,
            "speaker_id": self.speaker_id,
            "risk_score": self.risk_score,
            "policy_state": self.policy_state,
            "action": self.action,
            "reasons": sorted(self.reasons),
            "prev_hash": self.prev_hash,
        }
        raw_json = json.dumps(block_dict, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(raw_json.encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "call_id": self.call_id,
            "speaker_id": self.speaker_id,
            "risk_score": self.risk_score,
            "policy_state": self.policy_state,
            "action": self.action,
            "reasons": self.reasons,
            "prev_hash": self.prev_hash,
            "block_hash": self.block_hash,
        }

class AuditLedger:
    """
    Tamper-Evident SHA-256 Hash-Chained Audit Ledger.
    Ensures every voice risk decision, graduated control trigger, and MFA challenge
    is immutably recorded for regulatory, SEC, and forensic accountability.
    """

    def __init__(self):
        self._chain: List[AuditBlock] = []
        self._lock = threading.Lock()
        self._create_genesis_block()

    def _create_genesis_block(self) -> None:
        genesis = AuditBlock(
            index=0,
            timestamp="2026-01-01T00:00:00Z",
            call_id="GENESIS_BLOCK",
            speaker_id="SYSTEM",
            risk_score=0.0,
            policy_state="NORMAL",
            action="INITIALIZE_CHAIN",
            reasons=["BiTe_me immutable ledger initialized"],
            prev_hash="0" * 64,
        )
        self._chain.append(genesis)

    def append_decision(
        self,
        call_id: str,
        speaker_id: str,
        risk_score: float,
        policy_state: str,
        action: str,
        reasons: List[str],
    ) -> AuditBlock:
        """Appends a new verified decision block to the cryptographic chain."""
        with self._lock:
            prev_block = self._chain[-1]
            new_index = len(self._chain)
            timestamp = datetime.now(timezone.utc).isoformat()

            new_block = AuditBlock(
                index=new_index,
                timestamp=timestamp,
                call_id=call_id,
                speaker_id=speaker_id,
                risk_score=risk_score,
                policy_state=policy_state,
                action=action,
                reasons=reasons,
                prev_hash=prev_block.block_hash,
            )

            self._chain.append(new_block)
            return new_block

    def verify_integrity(self) -> Tuple[bool, Optional[str]]:
        """
        Validates the entire cryptographic chain from genesis to head.
        Returns (True, None) if completely untampered,
        or (False, "Violation description") if any block was altered.
        """
        with self._lock:
            for i in range(1, len(self._chain)):
                current = self._chain[i]
                previous = self._chain[i - 1]

                # 1. Verify prev_hash link
                if current.prev_hash != previous.block_hash:
                    return False, f"Broken chain link at Block #{current.index}: prev_hash does not match Block #{previous.index} hash."

                # 2. Verify current block's hash recomputation
                recalculated = current.compute_hash()
                if current.block_hash != recalculated:
                    return False, f"Tamper detected in Block #{current.index}: stored hash {current.block_hash} != computed {recalculated}."

            return True, None

    def get_recent_blocks(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._lock:
            return [b.to_dict() for b in self._chain[-limit:]]

    def export_chain(self) -> List[Dict[str, Any]]:
        with self._lock:
            return [b.to_dict() for b in self._chain]

    @property
    def total_blocks(self) -> int:
        with self._lock:
            return len(self._chain)
