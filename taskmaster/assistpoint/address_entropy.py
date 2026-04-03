import math
from typing import List, Dict


def compute_shannon_entropy(addresses: List[str]) -> float:
    """
    Compute Shannon entropy (bits) of an address sequence.
    """
    if not addresses:
        return 0.0

    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1

    total = len(addresses)
    entropy = 0.0
    for count in freq.values():
        p = count / total
        entropy -= p * math.log2(p)

    return round(entropy, 4)


def normalized_entropy(addresses: List[str]) -> float:
    """
    Compute normalized entropy in range [0.0, 1.0].
    """
    if not addresses:
        return 0.0
    unique_count = len(set(addresses))
    max_entropy = math.log2(unique_count) if unique_count > 1 else 1
    return round(compute_shannon_entropy(addresses) / max_entropy, 4)


def address_distribution(addresses: List[str]) -> Dict[str, float]:
    """
    Return distribution of addresses as {address: probability}.
    """
    if not addresses:
        return {}
    total = len(addresses)
    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1
    return {a: round(c / total, 4) for a, c in freq.items()}
