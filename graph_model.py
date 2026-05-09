import numpy as np
import networkx as nx

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

    all_nodes = list(G.nodes)

    for i in range(len(all_nodes)):
        for j in range(i + 1, len(all_nodes)):
            G.add_edge(all_nodes[i], all_nodes[j], weight=1.0)

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

    # Higher Fiedler value implies stronger algebraic connectivity, so the
    # bottleneck score must shrink as the graph gets healthier. We invert the
    # Cheeger-style sqrt(fiedler) signal and clamp into [0, 1] so downstream
    # penalties and the "lower is healthier" UI label stay consistent.
    bottleneck_score = max(0.0, 1.0 - float(np.sqrt(fiedler_value)))

    return {
        "fiedler_value": fiedler_value,
        "bottleneck_score": bottleneck_score,
        "fiedler_vector": fiedler_vector.tolist()
    }