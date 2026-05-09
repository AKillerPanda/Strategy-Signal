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
            "fiedler_value": 0,
            "bottleneck_score": 1,
            "fiedler_vector": []
        }

    L = nx.normalized_laplacian_matrix(G).toarray()
    eigenvalues, eigenvectors = np.linalg.eigh(L)

    fiedler_value = eigenvalues[1]
    fiedler_vector = eigenvectors[:, 1]

    bottleneck_score = np.sqrt(2 * fiedler_value)

    return {
        "fiedler_value": float(fiedler_value),
        "bottleneck_score": float(bottleneck_score),
        "fiedler_vector": fiedler_vector.tolist()
    }