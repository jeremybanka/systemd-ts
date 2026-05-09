FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
 && apt-get install --yes --no-install-recommends \
    bash \
    ca-certificates \
    coreutils \
    dbus \
    dbus-user-session \
    findutils \
    gawk \
    grep \
    procps \
    python3 \
    sudo \
    systemd \
    systemd-sysv \
    util-linux \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 1000 --shell /bin/bash runner \
 && printf 'runner ALL=(ALL) NOPASSWD:ALL\n' >/etc/sudoers.d/runner \
 && chmod 0440 /etc/sudoers.d/runner

STOPSIGNAL SIGRTMIN+3

CMD ["/sbin/init"]
