from typing import List, Dict, Union


def detect_volume_bursts(
    volumes: List[float],
    threshold_ratio: float = 1.5,
    min_interval: int = 1
) -> List[Dict[str, Union[int, float]]]:
    """
    Identify indices where volume jumps by threshold_ratio over previous.
    Returns list of dicts: {index, previous, current, ratio}.
    """
    if not volumes or len(volumes) < 2:
        return []

    events: List[Dict[str, Union[int, float]]] = []
    last_idx = -min_interval

    for i in range(1, len(volumes)):
        prev, curr = volumes[i - 1], volumes[i]
        ratio = (curr / prev) if prev > 0 else float("inf")
        if ratio >= threshold_ratio and (i - last_idx) >= min_interval:
            events.append({
                "index": i,
                "previous": prev,
                "current": curr,
                "ratio": round(ratio, 4)
            })
            last_idx = i

    return events


def summarize_bursts(
    bursts: List[Dict[str, Union[int, float]]]
) -> Dict[str, Union[int, float]]:
    """
    Summarize detected bursts: count, avg ratio, max ratio.
    """
    if not bursts:
        return {"count": 0, "avg_ratio": 0.0, "max_ratio": 0.0}

    ratios = [b["ratio"] for b in bursts if isinstance(b["ratio"], (int, float))]
    return {
        "count": len(bursts),
        "avg_ratio": round(sum(ratios) / len(ratios), 4),
        "max_ratio": max(ratios)
    }
