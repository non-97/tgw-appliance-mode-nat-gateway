import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface VpcProps {
  vpcCidr: string;
  natGateways: number;

  subnetConfiguration: cdk.aws_ec2.SubnetConfiguration[];
  tgwId: string;
  applianceModeSupport: string;
}

export class Vpc extends Construct {
  readonly vpc: cdk.aws_ec2.IVpc;
  readonly tgwAttachment: cdk.aws_ec2.CfnTransitGatewayVpcAttachment;

  constructor(scope: Construct, id: string, props: VpcProps) {
    super(scope, id);

    this.vpc = new cdk.aws_ec2.Vpc(this, "Default", {
      ipAddresses: cdk.aws_ec2.IpAddresses.cidr(props.vpcCidr),
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: props.natGateways,
      maxAzs: 2,
      subnetConfiguration: props.subnetConfiguration,
    });

    const tgwSubnetIds = this.vpc.selectSubnets({
      subnetGroupName: "Tgw",
    }).subnetIds;

    // Transit Gateway attachment
    this.tgwAttachment = new cdk.aws_ec2.CfnTransitGatewayVpcAttachment(
      this,
      "TransitGatewayAttachment",
      {
        subnetIds: tgwSubnetIds,
        transitGatewayId: props.tgwId,
        vpcId: this.vpc.vpcId,
        options: {
          DnsSupport: "enable",
          ApplianceModeSupport: props.applianceModeSupport,
        },
      }
    );

    // Route to Transit Gateway
    // To Class A Private IP address
    [
      ...this.vpc.publicSubnets,
      ...this.vpc.privateSubnets,
      ...this.vpc.isolatedSubnets,
    ].forEach((subnet, index) => {
      // Route tables for subnets with Transit Gateway attachments are not changed
      if (tgwSubnetIds.includes(subnet.subnetId)) {
        return;
      }

      new cdk.aws_ec2.CfnRoute(
        this,
        `RouteToTgwClassAPrivateIPAddressRouteTableForSubnet${subnet.ipv4CidrBlock}`,
        {
          routeTableId: subnet.routeTable.routeTableId,
          destinationCidrBlock: "10.0.0.0/8",
          transitGatewayId: props.tgwId,
        }
      ).addDependency(this.tgwAttachment);
    });

    // To Default route
    if (props.natGateways > 0) {
      return;
    }
    this.vpc
      .selectSubnets({
        subnetGroupName: "Egress",
      })
      .subnets.forEach((subnet, index) => {
        new cdk.aws_ec2.CfnRoute(
          this,
          `DefaultRouteToTgwRouteTableForSubnet${subnet.ipv4CidrBlock}`,
          {
            routeTableId: subnet.routeTable.routeTableId,
            destinationCidrBlock: "0.0.0.0/0",
            transitGatewayId: props.tgwId,
          }
        ).addDependency(this.tgwAttachment);
      });
  }
}
