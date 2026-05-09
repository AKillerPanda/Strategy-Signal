import numpy as np
import networkx as nx
import re


STOP_WORDS = {
    "and",
    "the",
    "for",
    "with",
    "flow",
    "launch",
    "beta",
    "public",
    "product",
    "channel",
}


def _tokens(value):
    return {
        token
        for token in re.findall(r"[a-z0-9]+", str(value).lower())
        if token and token not in STOP_WORDS
    }


def _relationship_weight(left, right, base_weight, overlap_boost=0.45):
    left_tokens = _tokens(left)
    right_tokens = _tokens(right)
    if not left_tokens or not right_tokens:
        return round(base_weight, 3)

    similarity = len(left_tokens & right_tokens) / len(left_tokens | right_tokens)
    return round(min(1.0, base_weight + similarity * overlap_boost), 3)


def _connect_groups(graph, left_nodes, right_nodes, base_weight):
    for left_node in left_nodes:
        for right_node in right_nodes:
            graph.add_edge(
                left_node,
                right_node,
                weight=_relationship_weight(left_node, right_node, base_weight),
            )


def _connect_sequential(graph, nodes, base_weight):
    for left_node, right_node in zip(nodes, nodes[1:]):
        graph.add_edge(
            left_node,
            right_node,
            weight=_relationship_weight(left_node, right_node, base_weight, 0.25),
        )


def _bridge_components(graph):
    components = list(nx.connected_components(graph))
    while len(components) > 1:
        left_node = sorted(components[0])[0]
        right_node = sorted(components[1])[0]
        graph.add_edge(left_node, right_node, weight=0.15)
        components = list(nx.connected_components(graph))

def build_strategy_graph(features, channels, competitors, milestones):
    G = nx.Graph()

    for item in features:
        G.add_node(item, type="feature")

    for item in channels:
        G.add_node(item, type="marketing_channel")

    for item in competitors:
        G.add_node(item, type="competitor")

    for item in milestones:
        G.add_node(item, type="milestone")

    if features and channels:
        _connect_groups(G, channels, features, 0.55)

    if features and milestones:
        _connect_groups(G, features, milestones, 0.7)

    if competitors and features:
        _connect_groups(G, competitors, features, 0.45)

    if competitors and channels:
        _connect_groups(G, competitors, channels, 0.35)

    if milestones:
        _connect_sequential(G, milestones, 0.85)

    if features:
        _connect_sequential(G, features, 0.4)

    if channels:
        _connect_sequential(G, channels, 0.3)

    if competitors:
        _connect_sequential(G, competitors, 0.25)

    if G.number_of_nodes() > 1 and not nx.is_connected(G):
        _bridge_components(G)

    return G


def spectral_analysis(G):
    if len(G.nodes) < 3:
        return {
            "fiedler_value": 0.0,
            "bottleneck_score": 1.0,
            "fiedler_vector": []
        }

    L = nx.normalized_laplacian_matrix(G).toarray()
    eigenvalues, eigenvectors = np.linalg.eigh(L)

    fiedler_value = float(eigenvalues[1])
    fiedler_vector = eigenvectors[:, 1]

    # Use the second normalized-Laplacian eigenvalue as a simple connectivity
    # proxy and derive a normalized fragmentation score for the MVP.
    bottleneck_score = max(0.0, min(1.0, 1.0 - float(fiedler_value)))

    return {
        "fiedler_value": fiedler_value,
        "bottleneck_score": bottleneck_score,
        "fiedler_vector": fiedler_vector.tolist()
    }