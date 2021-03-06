<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints as Assert;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * @ORM\Entity(repositoryClass="App\Repository\UserRepository")
 * @ORM\Table(name="na_user")
 * @Assert\UniqueEntity("username")
 * @Assert\UniqueEntity("email")
 */
class User implements UserInterface, \Serializable
{
    /**
     * @var int
     *
     * @ORM\Id()
     * @ORM\GeneratedValue()
     * @ORM\Column(type="integer")
     */
    private $id;

    /**
     * @var string
     *
     * @ORM\Column(type="string", length=255, unique=true)
     */
    private $username;

    /**
     * @var string|null
     *
     * @ORM\Column(type="string", length=255, unique=true, nullable=true)
     */
    private $email;

    /**
     * @var string|null
     */
    private $plainPassword;

    /**
     * @var string|null
     *
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $password;

    /**
     * @var string|null
     *
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $salt;

    /**
     * @var array
     *
     * @ORM\Column(type="array")
     */
    private $roles = ['ROLE_USER'];

    /**
     * @var bool
     *
     * @ORM\Column(type="boolean")
     */
    private $hidden = false;

    /**
     * @var string|null
     *
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $activationToken;

    /**
     * @var \DateTimeInterface|null
     *
     * @ORM\Column(type="datetime_immutable", nullable=true)
     */
    private $activationTokenExpiresAt;

    /**
     * @var \DateTimeImmutable
     *
     * @ORM\Column(type="datetime_immutable")
     */
    private $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function __toString(): string
    {
        return $this->getUsername();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUsername(): ?string
    {
        return $this->username;
    }

    public function setUsername(string $username): self
    {
        $this->username = $username;

        return $this;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): self
    {
        $this->email = $email;

        return $this;
    }

    public function getPlainPassword(): ?string
    {
        return $this->plainPassword;
    }

    public function setPlainPassword(?string $password): self
    {
        $this->plainPassword = $password;
        $this->password = null;

        return $this;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(?string $password): self
    {
        $this->password = $password;

        return $this;
    }

    public function getSalt(): ?string
    {
        return $this->salt;
    }

    public function generateSalt(): self
    {
        $this->salt = md5(random_bytes(10));

        return $this;
    }

    public function eraseCredentials()
    {
        $this->plainPassword = null;
    }

    public function getRoles(): array
    {
        return $this->roles;
    }

    public function addRole(string $role): self
    {
        if (!in_array($role, $this->roles)) {
            $this->roles[] = $role;
        }

        return $this;
    }

    public function removeRole(string $role): self
    {
        $key = array_search($role, $this->roles);

        if ($key !== false) {
            unset($this->roles[$key]);
        }

        return $this;
    }

    public function isHidden(): bool
    {
        return $this->hidden;
    }

    public function hide(): self
    {
        $this->hidden = true;

        return $this;
    }

    public function expose(): self
    {
        $this->hidden = false;

        return $this;
    }

    public function getActivationToken(): ?string
    {
        return $this->activationToken;
    }

    public function activationTokenIsValid(): bool
    {
        return $this->activationTokenExpiresAt > new \DateTime;
    }

    public function generateActivationToken(): self
    {
        $this->activationToken = md5(random_bytes(10));
        $this->activationTokenExpiresAt = new \DateTimeImmutable('+1 hour');

        return $this;
    }

    public function clearActivationToken(): self
    {
        $this->activationToken = null;
        $this->activationTokenExpiresAt = null;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function isAdmin(): bool
    {
        return in_array('ROLE_ADMIN', $this->roles) || in_array('ROLE_SUPER_ADMIN', $this->roles);
    }

    public function setAdmin(bool $admin): self
    {
        if (!in_array('ROLE_SUPER_ADMIN', $this->roles)) {
            if ($admin) {
                $this->roles = ['ROLE_ADMIN'];
            } else {
                $this->roles = ['ROLE_USER'];
            }
        }

        return $this;
    }

    public function isMod(): bool
    {
        return in_array('ROLE_MOD', $this->roles) || $this->isAdmin();
    }

    public function setMod(bool $mod): self
    {
        if (!$this->isAdmin()) {
            if ($mod) {
                $this->roles = ['ROLE_MOD'];
            } else {
                $this->roles = ['ROLE_USER'];
            }
        }

        return $this;
    }

    /** @see \Serializable::serialize() */
    public function serialize()
    {
        return serialize(array(
            $this->id,
            $this->username,
            $this->password,
            $this->salt,
        ));
    }

    /** @see \Serializable::unserialize() */
    public function unserialize($serialized)
    {
        list (
            $this->id,
            $this->username,
            $this->password,
            $this->salt
        ) = unserialize($serialized, ['allowed_classes' => false]);
    }
}
