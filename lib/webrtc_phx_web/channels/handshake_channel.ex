defmodule WebrtcPhxWeb.HandshakeChannel do
  use Phoenix.Channel

  def join("handshake:" <> name , _, socket) do
    socket
    |> assign(:name, name)
    |> (&{:ok, &1}).()
  end

  def handle_in("offer", %{"target" => target, "offer" => offer}, socket) do
    WebrtcPhxWeb.Endpoint.broadcast(
      "handshake:" <> target,
      "offer",
      %{from: socket.assigns.name, offer: offer}
    )

    {:noreply, socket}
  end

  def handle_in("answer", %{"target" => target, "answer" => answer}, socket) do
    WebrtcPhxWeb.Endpoint.broadcast(
      "handshake:" <> target,
      "answer",
      %{from: socket.assigns.name, answer: answer}
    )

    {:noreply, socket}
  end

  def handle_in("ice", %{"target" => target, "ice" => ice}, socket) do
    WebrtcPhxWeb.Endpoint.broadcast(
      "handshake:" <> target,
      "ice",
      %{from: socket.assigns.name, ice: ice}
    )

    {:noreply, socket}
  end
end
