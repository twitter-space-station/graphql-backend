import {Prisma} from '.prisma/client';
import {Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import {UserFollowingSpacesConnection} from './dto/resolve-following-spaces.dto';
import {UserHostedSpacesConnection} from './dto/resolve-hosted-spaces.dto';
import {UserEntity} from './user.entity';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  async findOne(
    where: {id: string} | {uniqueName: string},
  ): Promise<UserEntity | null> {
    return this.prismaService.user.findUnique({
      where,
      select: {
        id: true,
        uniqueName: true,
        displayName: true,
        picture: true,
      },
    });
  }

  async all(): Promise<UserEntity[]> {
    return this.prismaService.user.findMany({
      select: {
        id: true,
        uniqueName: true,
        displayName: true,
        picture: true,
      },
    });
  }

  async getHostedSpaces(
    userId: string,
    params: {take: number} | {cursor: string; take: number},
    conditions: {finished: boolean},
    orderBy: {openDate: Prisma.SortOrder},
  ): Promise<UserHostedSpacesConnection | null> {
    return ('cursor' in params
      ? this.prismaService.space.findMany({
          where: {
            hostUserId: userId,
            finished: conditions.finished,
          },
          cursor: {id: params.cursor},
          skip: 1,
          take: params.take,
          select: {id: true, hostUserId: true},
          orderBy: {openDate: orderBy.openDate},
        })
      : this.prismaService.space.findMany({
          where: {
            hostUserId: userId,
            finished: conditions.finished,
          },
          take: params.take,
          select: {id: true, hostUserId: true},
          orderBy: {openDate: orderBy.openDate},
        })
    ).then((followings) => ({
      edges: followings.map(({id, hostUserId}) => ({
        cursor: id,
        node: {spaceId: id, userId: hostUserId},
      })),
      pageInfo: {
        endCursor: followings[followings.length - 1]?.id,
        hasNextPage: followings.length === params.take,
      },
    }));
  }

  async getFollowingSpaces(
    userId: string,
    params: {take: number} | {cursor: string; take: number},
    conditions: {finished: boolean},
    orderBy: {updatedAt: Prisma.SortOrder},
  ): Promise<UserFollowingSpacesConnection | null> {
    return ('cursor' in params
      ? this.prismaService.following.findMany({
          where: {
            userId,
            space: {finished: conditions.finished},
          },
          cursor: {id: params.cursor},
          skip: 1,
          take: params.take,
          select: {id: true, spaceId: true, userId: true},
          orderBy: {updatedAt: orderBy.updatedAt},
        })
      : this.prismaService.following.findMany({
          where: {
            userId,
            space: {finished: conditions.finished},
          },
          take: params.take,
          select: {id: true, spaceId: true, userId: true},
          orderBy: {updatedAt: orderBy.updatedAt},
        })
    ).then((followings) => ({
      edges: followings.map(({id, spaceId, userId}) => ({
        cursor: id,
        node: {id, spaceId, userId},
      })),
      pageInfo: {
        endCursor: followings[followings.length - 1]?.id,
        hasNextPage: followings.length === params.take,
      },
    }));
  }

  async isSpaceFollowing(userId: string, spaceId: string): Promise<boolean> {
    return this.prismaService.following
      .findUnique({
        where: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          spaceId_userId: {spaceId, userId},
        },
      })
      .then((following) => Boolean(following));
  }

  async ensureUser(
    where: {id: string},
    {
      uniqueName,
      displayName,
      picture,
    }: {
      uniqueName: string;
      displayName: string;
      picture: string;
    },
  ): Promise<UserEntity> {
    return this.prismaService.user.upsert({
      where,
      create: {
        uniqueName,
        displayName,
        picture,
      },
      update: {
        uniqueName,
        displayName,
        picture,
      },
      select: {
        id: true,
        uniqueName: true,
        displayName: true,
        picture: true,
      },
    });
  }
}
